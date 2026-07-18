use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeSet, HashMap, HashSet, VecDeque},
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::Instant,
};
use tauri::{Emitter, State};
use walkdir::WalkDir;

const MAX_ENTRIES: usize = 2_500;
const MAX_TEXT_BYTES: u64 = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES: usize = 512 * 1024;
const MAX_BLUEPRINT_NODES: usize = 10_000;
const MAX_BLUEPRINT_EDGES: usize = 50_000;
const MAX_BLUEPRINT_ID_BYTES: usize = 256;
const DEFAULT_BLUEPRINT_NODE_WIDTH: f64 = 190.0;
const DEFAULT_BLUEPRINT_NODE_HEIGHT: f64 = 60.0;
const MAX_ANIMATION_PACKAGE_BYTES: usize = 16 * 1024 * 1024;
const MAX_VIDEO_FRAMES: usize = 3_600;
const MAX_VIDEO_FRAME_BYTES: usize = 8 * 1024 * 1024;
const MAX_VIDEO_TOTAL_BYTES: usize = 256 * 1024 * 1024;

#[derive(Default)]
struct StudioState {
    trusted_roots: Mutex<HashSet<PathBuf>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Detection {
    id: String,
    label: String,
    confidence: f32,
    evidence: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileEntry {
    path: String,
    name: String,
    kind: String,
    depth: usize,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskDefinition {
    id: String,
    label: String,
    program: String,
    arguments: Vec<String>,
    working_directory: String,
    kind: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSnapshot {
    root: String,
    name: String,
    trusted: bool,
    detections: Vec<Detection>,
    files: Vec<FileEntry>,
    tasks: Vec<TaskDefinition>,
    truncated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TextFile {
    path: String,
    content: String,
    sha256: String,
    size: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolchainDiagnostic {
    id: String,
    label: String,
    available: bool,
    summary: String,
    remediation: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TaskResult {
    task_id: String,
    command: String,
    working_directory: String,
    success: bool,
    exit_code: Option<i32>,
    duration_ms: u128,
    output: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportResult {
    path: String,
    size: u64,
    frames: Option<usize>,
    duration_ms: u128,
    encoder: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BlueprintLayoutNode {
    id: String,
    width: Option<f64>,
    height: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct BlueprintLayoutEdge {
    from_node_id: String,
    to_node_id: String,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct BlueprintNodePosition {
    id: String,
    x: f64,
    y: f64,
    layer: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BlueprintLayoutResult {
    positions: Vec<BlueprintNodePosition>,
    width: f64,
    height: f64,
    duration_micros: u128,
    cyclic: bool,
    engine: &'static str,
}

fn blueprint_dimension(value: Option<f64>, fallback: f64) -> Result<f64, String> {
    let value = value.unwrap_or(fallback);
    if !value.is_finite() || !(24.0..=2_000.0).contains(&value) {
        return Err("Blueprint node dimensions must be finite and between 24 and 2,000".into());
    }
    Ok(value)
}

fn portable_blueprint_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_BLUEPRINT_ID_BYTES
        && id.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'/' | b'-')
        })
}

/// Produces a stable layered layout without recursion. Strongly connected
/// components are condensed first, so malformed or intentional cycles cannot
/// overflow the stack and remain visually grouped on the same layer.
fn layout_blueprint_graph_inner(
    nodes: Vec<BlueprintLayoutNode>,
    edges: Vec<BlueprintLayoutEdge>,
) -> Result<BlueprintLayoutResult, String> {
    let started = Instant::now();
    if nodes.len() > MAX_BLUEPRINT_NODES {
        return Err(format!(
            "Blueprint exceeds the {MAX_BLUEPRINT_NODES} node native-layout limit"
        ));
    }
    if edges.len() > MAX_BLUEPRINT_EDGES {
        return Err(format!(
            "Blueprint exceeds the {MAX_BLUEPRINT_EDGES} wire native-layout limit"
        ));
    }
    if nodes.is_empty() {
        return Ok(BlueprintLayoutResult {
            positions: Vec::new(),
            width: 0.0,
            height: 0.0,
            duration_micros: started.elapsed().as_micros(),
            cyclic: false,
            engine: "rust-scc-layered-v1",
        });
    }

    let mut index_by_id = HashMap::with_capacity(nodes.len());
    let mut dimensions = Vec::with_capacity(nodes.len());
    for (index, node) in nodes.iter().enumerate() {
        if !portable_blueprint_id(&node.id) {
            return Err("Blueprint node IDs must contain 1 to 256 portable ID characters".into());
        }
        if index_by_id.insert(node.id.clone(), index).is_some() {
            return Err(format!("Duplicate Blueprint node ID: {}", node.id));
        }
        dimensions.push((
            blueprint_dimension(node.width, DEFAULT_BLUEPRINT_NODE_WIDTH)?,
            blueprint_dimension(node.height, DEFAULT_BLUEPRINT_NODE_HEIGHT)?,
        ));
    }

    let mut adjacency = vec![Vec::<usize>::new(); nodes.len()];
    let mut reverse = vec![Vec::<usize>::new(); nodes.len()];
    let mut has_self_edge = false;
    for edge in &edges {
        let from = *index_by_id
            .get(&edge.from_node_id)
            .ok_or_else(|| format!("Unknown Blueprint source node: {}", edge.from_node_id))?;
        let to = *index_by_id
            .get(&edge.to_node_id)
            .ok_or_else(|| format!("Unknown Blueprint destination node: {}", edge.to_node_id))?;
        has_self_edge |= from == to;
        adjacency[from].push(to);
        reverse[to].push(from);
    }
    for neighbors in adjacency.iter_mut().chain(reverse.iter_mut()) {
        neighbors.sort_unstable_by(|left, right| nodes[*left].id.cmp(&nodes[*right].id));
        neighbors.dedup();
    }

    let mut ordered_indices = (0..nodes.len()).collect::<Vec<_>>();
    ordered_indices.sort_unstable_by(|left, right| nodes[*left].id.cmp(&nodes[*right].id));

    // Iterative Kosaraju pass one: stable finishing order, no call-stack growth.
    let mut visited = vec![false; nodes.len()];
    let mut finish_order = Vec::with_capacity(nodes.len());
    for start in ordered_indices.iter().copied() {
        if visited[start] {
            continue;
        }
        visited[start] = true;
        let mut stack = vec![(start, 0_usize)];
        while let Some((current, next_neighbor)) = stack.last_mut() {
            if let Some(&next) = adjacency[*current].get(*next_neighbor) {
                *next_neighbor += 1;
                if !visited[next] {
                    visited[next] = true;
                    stack.push((next, 0));
                }
            } else {
                let (finished, _) = stack.pop().expect("stack contains current node");
                finish_order.push(finished);
            }
        }
    }

    // Pass two assigns strongly connected components over the transposed graph.
    let mut component_of = vec![usize::MAX; nodes.len()];
    let mut components = Vec::<Vec<usize>>::new();
    for start in finish_order.into_iter().rev() {
        if component_of[start] != usize::MAX {
            continue;
        }
        let component_id = components.len();
        let mut members = Vec::new();
        let mut queue = VecDeque::from([start]);
        component_of[start] = component_id;
        while let Some(current) = queue.pop_front() {
            members.push(current);
            for &next in &reverse[current] {
                if component_of[next] == usize::MAX {
                    component_of[next] = component_id;
                    queue.push_back(next);
                }
            }
        }
        members.sort_unstable_by(|left, right| nodes[*left].id.cmp(&nodes[*right].id));
        components.push(members);
    }

    let component_keys = components
        .iter()
        .map(|members| nodes[members[0]].id.clone())
        .collect::<Vec<_>>();
    let mut component_edges = vec![BTreeSet::<usize>::new(); components.len()];
    let mut indegree = vec![0_usize; components.len()];
    for (from, neighbors) in adjacency.iter().enumerate() {
        for &to in neighbors {
            let from_component = component_of[from];
            let to_component = component_of[to];
            if from_component != to_component
                && component_edges[from_component].insert(to_component)
            {
                indegree[to_component] += 1;
            }
        }
    }

    let mut ready = BTreeSet::<(String, usize)>::new();
    for (component, degree) in indegree.iter().enumerate() {
        if *degree == 0 {
            ready.insert((component_keys[component].clone(), component));
        }
    }
    let mut layers = vec![0_usize; components.len()];
    while let Some((_, component)) = ready.pop_first() {
        for &next in &component_edges[component] {
            layers[next] = layers[next].max(layers[component] + 1);
            indegree[next] -= 1;
            if indegree[next] == 0 {
                ready.insert((component_keys[next].clone(), next));
            }
        }
    }

    let maximum_layer = layers.iter().copied().max().unwrap_or(0);
    let mut nodes_by_layer = vec![Vec::<usize>::new(); maximum_layer + 1];
    for (component, members) in components.iter().enumerate() {
        nodes_by_layer[layers[component]].extend(members.iter().copied());
    }
    for members in &mut nodes_by_layer {
        members.sort_unstable_by(|left, right| {
            component_keys[component_of[*left]]
                .cmp(&component_keys[component_of[*right]])
                .then_with(|| nodes[*left].id.cmp(&nodes[*right].id))
        });
    }

    let layer_widths = nodes_by_layer
        .iter()
        .map(|members| {
            members
                .iter()
                .map(|index| dimensions[*index].0)
                .fold(DEFAULT_BLUEPRINT_NODE_WIDTH, f64::max)
        })
        .collect::<Vec<_>>();
    let mut layer_x = vec![20.0_f64; nodes_by_layer.len()];
    for layer in 1..layer_x.len() {
        layer_x[layer] = layer_x[layer - 1] + layer_widths[layer - 1] + 120.0;
    }

    let mut positions = Vec::with_capacity(nodes.len());
    let mut canvas_width = 0.0_f64;
    let mut canvas_height = 0.0_f64;
    for (layer, members) in nodes_by_layer.iter().enumerate() {
        let mut y = 40.0_f64;
        for index in members {
            let (width, height) = dimensions[*index];
            positions.push(BlueprintNodePosition {
                id: nodes[*index].id.clone(),
                x: layer_x[layer],
                y,
                layer,
            });
            canvas_width = canvas_width.max(layer_x[layer] + width + 40.0);
            canvas_height = canvas_height.max(y + height + 40.0);
            y += height + 55.0;
        }
    }
    positions.sort_unstable_by(|left, right| left.id.cmp(&right.id));

    Ok(BlueprintLayoutResult {
        positions,
        width: canvas_width,
        height: canvas_height,
        duration_micros: started.elapsed().as_micros(),
        cyclic: has_self_edge || components.iter().any(|members| members.len() > 1),
        engine: "rust-scc-layered-v1",
    })
}

#[tauri::command]
async fn layout_blueprint_graph(
    nodes: Vec<BlueprintLayoutNode>,
    edges: Vec<BlueprintLayoutEdge>,
) -> Result<BlueprintLayoutResult, String> {
    tauri::async_runtime::spawn_blocking(move || layout_blueprint_graph_inner(nodes, edges))
        .await
        .map_err(|error| format!("Native Blueprint layout worker failed: {error}"))?
}

fn canonical_root(root: &str) -> Result<PathBuf, String> {
    let path = fs::canonicalize(root).map_err(|error| format!("Cannot open workspace: {error}"))?;
    if !path.is_dir() {
        return Err("Workspace path is not a directory".into());
    }
    Ok(path)
}

fn safe_relative(relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("Path must be a workspace-relative path without traversal".into());
    }
    Ok(path.to_path_buf())
}

fn canonical_child(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = safe_relative(relative)?;
    let child = fs::canonicalize(root.join(relative))
        .map_err(|error| format!("Cannot resolve workspace file: {error}"))?;
    if !child.starts_with(root) {
        return Err("Resolved path escapes the workspace".into());
    }
    Ok(child)
}

fn is_trusted(state: &StudioState, root: &Path) -> bool {
    state
        .trusted_roots
        .lock()
        .map(|roots| roots.contains(root))
        .unwrap_or(false)
}

fn require_trust(state: &StudioState, root: &Path) -> Result<(), String> {
    if is_trusted(state, root) {
        Ok(())
    } else {
        Err("Workspace trust is required for writes and process execution".into())
    }
}

fn marker(root: &Path, relative: &str) -> bool {
    root.join(relative).exists()
}

fn detect(root: &Path) -> Vec<Detection> {
    let mut found = Vec::new();
    let mut add = |id: &str, label: &str, confidence: f32, evidence: Vec<&str>| {
        found.push(Detection {
            id: id.into(),
            label: label.into(),
            confidence,
            evidence: evidence.into_iter().map(String::from).collect(),
        });
    };
    if marker(root, "platform/package.json")
        && marker(
            root,
            "platform/schemas/animation-binary/animation-package.fbs",
        )
    {
        add(
            "animation-platform",
            "Animation and feature platform",
            1.0,
            vec!["platform/package.json", "FlatBuffers animation schema"],
        );
    }
    if marker(root, "pnpm-workspace.yaml") && marker(root, "pnpm-lock.yaml") {
        add(
            "pnpm-monorepo",
            "pnpm monorepo",
            0.99,
            vec!["pnpm-workspace.yaml", "pnpm-lock.yaml"],
        );
    }
    if marker(root, "turbo.json") {
        add("turborepo", "Turborepo workspace", 0.96, vec!["turbo.json"]);
    }
    if marker(root, "apps/web/next.config.ts") || marker(root, "next.config.ts") {
        add(
            "nextjs",
            "Next.js applications",
            0.95,
            vec!["Next.js configuration"],
        );
    }
    if marker(root, "apps/mobile/app.json") || marker(root, "app.json") {
        add(
            "expo",
            "Expo / React Native applications",
            0.95,
            vec!["Expo app.json"],
        );
    }
    if marker(root, "tools/studio/src-tauri/Cargo.toml") || marker(root, "Cargo.toml") {
        add("rust", "Rust / Cargo", 0.94, vec!["Cargo.toml"]);
    }
    if marker(root, "platform/sdks/c-abi/CMakeLists.txt") || marker(root, "CMakeLists.txt") {
        add("cmake", "CMake / C++", 0.9, vec!["CMakeLists.txt"]);
    }
    if marker(root, ".github/workflows") {
        add("ci", "GitHub Actions", 0.86, vec![".github/workflows"]);
    }
    if marker(root, ".git") {
        add("git", "Git repository", 1.0, vec![".git"]);
    }
    found.sort_by(|left, right| right.confidence.total_cmp(&left.confidence));
    found
}

fn ignored_name(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | "node_modules"
            | ".next"
            | ".turbo"
            | "dist"
            | "build"
            | "target"
            | "coverage"
            | ".expo"
    ) || name.starts_with(".env")
}

fn list_files(root: &Path) -> (Vec<FileEntry>, bool) {
    let mut files = Vec::new();
    let walker = WalkDir::new(root)
        .max_depth(7)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            entry.depth() == 0 || !ignored_name(&entry.file_name().to_string_lossy())
        });
    for item in walker.flatten().skip(1) {
        if files.len() >= MAX_ENTRIES {
            return (files, true);
        }
        let Ok(relative) = item.path().strip_prefix(root) else {
            continue;
        };
        let Ok(metadata) = item.metadata() else {
            continue;
        };
        files.push(FileEntry {
            path: relative.to_string_lossy().replace('\\', "/"),
            name: item.file_name().to_string_lossy().into_owned(),
            kind: if metadata.is_dir() {
                "directory"
            } else {
                "file"
            }
            .into(),
            depth: item.depth().saturating_sub(1),
            size: metadata.len(),
        });
    }
    (files, false)
}

fn available_tasks(root: &Path) -> Vec<TaskDefinition> {
    let definitions = [
        (
            "platform-demo",
            "Run platform vertical slice",
            "platform",
            vec!["--dir", "platform", "demo"],
            "run",
        ),
        (
            "platform-check",
            "Test and build platform",
            "platform",
            vec!["--dir", "platform", "check"],
            "test",
        ),
        (
            "playground-build",
            "Build example application",
            "apps/platform-playground",
            vec!["--dir", "apps/platform-playground", "build"],
            "build",
        ),
        (
            "studio-check",
            "Verify Studio",
            "tools/studio",
            vec!["--dir", "tools/studio", "check"],
            "test",
        ),
        (
            "web-build",
            "Build newspaper web application",
            "apps/web",
            vec!["--dir", "apps/web", "build"],
            "build",
        ),
    ];
    definitions
        .into_iter()
        .filter(|(_, _, required, _, _)| marker(root, required))
        .map(|(id, label, _, arguments, kind)| TaskDefinition {
            id: id.into(),
            label: label.into(),
            program: "pnpm".into(),
            arguments: arguments.into_iter().map(String::from).collect(),
            working_directory: root.to_string_lossy().into_owned(),
            kind: kind.into(),
        })
        .collect()
}

#[tauri::command]
fn default_workspace() -> Result<String, String> {
    let start = Path::new(env!("CARGO_MANIFEST_DIR"));
    start
        .ancestors()
        .find(|path| path.join("pnpm-workspace.yaml").exists())
        .map(|path| path.to_string_lossy().into_owned())
        .ok_or_else(|| "Could not locate the repository workspace".into())
}

#[tauri::command]
fn inspect_workspace(
    root: String,
    state: State<'_, StudioState>,
) -> Result<WorkspaceSnapshot, String> {
    let root = canonical_root(&root)?;
    let (files, truncated) = list_files(&root);
    Ok(WorkspaceSnapshot {
        name: root
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned(),
        root: root.to_string_lossy().into_owned(),
        trusted: is_trusted(&state, &root),
        detections: detect(&root),
        tasks: available_tasks(&root),
        files,
        truncated,
    })
}

#[tauri::command]
fn trust_workspace(root: String, state: State<'_, StudioState>) -> Result<bool, String> {
    let root = canonical_root(&root)?;
    state
        .trusted_roots
        .lock()
        .map_err(|_| "Trust state is unavailable")?
        .insert(root);
    Ok(true)
}

#[tauri::command]
fn read_workspace_file(root: String, relative: String) -> Result<TextFile, String> {
    let root = canonical_root(&root)?;
    let child = canonical_child(&root, &relative)?;
    let metadata = fs::metadata(&child).map_err(|error| format!("Cannot inspect file: {error}"))?;
    if !metadata.is_file() || metadata.len() > MAX_TEXT_BYTES {
        return Err("File is not a bounded text file".into());
    }
    let bytes = fs::read(&child).map_err(|error| format!("Cannot read file: {error}"))?;
    let content = String::from_utf8(bytes)
        .map_err(|_| "Binary files cannot be opened in the source editor")?;
    let sha256 = hex::encode(Sha256::digest(content.as_bytes()));
    Ok(TextFile {
        path: relative,
        size: content.len(),
        content,
        sha256,
    })
}

#[tauri::command]
fn write_workspace_file(
    root: String,
    relative: String,
    content: String,
    expected_sha256: String,
    state: State<'_, StudioState>,
) -> Result<TextFile, String> {
    if content.len() as u64 > MAX_TEXT_BYTES {
        return Err("File exceeds the NJC Studio text limit".into());
    }
    let root = canonical_root(&root)?;
    require_trust(&state, &root)?;
    let child = canonical_child(&root, &relative)?;
    let current = fs::read(&child).map_err(|error| format!("Cannot read current file: {error}"))?;
    let current_hash = hex::encode(Sha256::digest(&current));
    if current_hash != expected_sha256 {
        return Err(
            "File changed outside NJC Studio; reload or resolve the conflict before saving".into(),
        );
    }
    let parent = child.parent().ok_or("File has no writable parent")?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|error| format!("Cannot create safe-write file: {error}"))?;
    temporary
        .write_all(content.as_bytes())
        .map_err(|error| format!("Cannot write safe-write file: {error}"))?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|error| format!("Cannot sync safe-write file: {error}"))?;
    temporary
        .persist(&child)
        .map_err(|error| format!("Cannot atomically replace file: {}", error.error))?;
    let sha256 = hex::encode(Sha256::digest(content.as_bytes()));
    Ok(TextFile {
        path: relative,
        size: content.len(),
        content,
        sha256,
    })
}

fn create_workspace_file_inner(
    root: String,
    relative: String,
    content: String,
    state: &StudioState,
) -> Result<TextFile, String> {
    if content.len() as u64 > MAX_TEXT_BYTES {
        return Err("File exceeds the NJC Studio text limit".into());
    }
    let root = canonical_root(&root)?;
    require_trust(state, &root)?;
    let relative_path = safe_relative(&relative)?;
    if relative_path.extension().and_then(|value| value.to_str()) != Some("pani") {
        return Err("New animation files must use the .pani extension".into());
    }
    let child = root.join(&relative_path);
    if child.exists() {
        return Err("A file with that name already exists".into());
    }
    let parent = child.parent().ok_or("File has no writable parent")?;
    let nearest_existing = parent
        .ancestors()
        .find(|candidate| candidate.exists())
        .ok_or("Cannot resolve the destination directory")?;
    let nearest_existing = fs::canonicalize(nearest_existing)
        .map_err(|error| format!("Cannot resolve destination directory: {error}"))?;
    if !nearest_existing.starts_with(&root) {
        return Err("Destination escapes the workspace".into());
    }
    fs::create_dir_all(parent)
        .map_err(|error| format!("Cannot create animation directory: {error}"))?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| format!("Cannot resolve animation directory: {error}"))?;
    if !canonical_parent.starts_with(&root) {
        return Err("Destination escapes the workspace".into());
    }
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&child)
        .map_err(|error| format!("Cannot create animation file: {error}"))?;
    file.write_all(content.as_bytes())
        .map_err(|error| format!("Cannot write animation file: {error}"))?;
    file.sync_all()
        .map_err(|error| format!("Cannot sync animation file: {error}"))?;
    let sha256 = hex::encode(Sha256::digest(content.as_bytes()));
    Ok(TextFile {
        path: relative,
        size: content.len(),
        content,
        sha256,
    })
}

#[tauri::command]
fn create_workspace_file(
    root: String,
    relative: String,
    content: String,
    state: State<'_, StudioState>,
) -> Result<TextFile, String> {
    create_workspace_file_inner(root, relative, content, &state)
}

fn atomic_export(destination: &str, suffix: &str, bytes: &[u8]) -> Result<ExportResult, String> {
    let started = Instant::now();
    let path = Path::new(destination);
    if !path.is_absolute() {
        return Err("Export destination must be an absolute path selected by the user".into());
    }
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("Export destination needs a valid file name")?;
    if !file_name.to_ascii_lowercase().ends_with(suffix) {
        return Err(format!("Export destination must end with {suffix}"));
    }
    let parent = path
        .parent()
        .ok_or("Export destination has no parent directory")?;
    let parent = fs::canonicalize(parent)
        .map_err(|error| format!("Cannot resolve export directory: {error}"))?;
    if !parent.is_dir() {
        return Err("Export destination parent is not a directory".into());
    }
    let destination = parent.join(file_name);
    let mut temporary = tempfile::NamedTempFile::new_in(&parent)
        .map_err(|error| format!("Cannot create safe export file: {error}"))?;
    temporary
        .write_all(bytes)
        .map_err(|error| format!("Cannot write export file: {error}"))?;
    temporary
        .as_file()
        .sync_all()
        .map_err(|error| format!("Cannot sync export file: {error}"))?;
    temporary
        .persist(&destination)
        .map_err(|error| format!("Cannot finalize export file: {}", error.error))?;
    Ok(ExportResult {
        path: destination.to_string_lossy().into_owned(),
        size: bytes.len() as u64,
        frames: None,
        duration_ms: started.elapsed().as_millis(),
        encoder: None,
    })
}

#[tauri::command]
fn import_animation_file(
    root: String,
    source_path: String,
    state: State<'_, StudioState>,
) -> Result<TextFile, String> {
    let source = fs::canonicalize(&source_path)
        .map_err(|error| format!("Cannot open selected animation: {error}"))?;
    if source.extension().and_then(|value| value.to_str()) != Some("pani") {
        return Err("Imported animation must use the .pani extension".into());
    }
    let metadata = fs::metadata(&source)
        .map_err(|error| format!("Cannot inspect selected animation: {error}"))?;
    if !metadata.is_file() || metadata.len() > MAX_TEXT_BYTES {
        return Err("Imported animation is not a bounded source file".into());
    }
    let content = fs::read_to_string(&source)
        .map_err(|_| "Imported animation must be valid UTF-8 source".to_string())?;
    let name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or("Imported animation needs a valid file name")?;
    create_workspace_file_inner(root, format!("animations/{name}"), content, &state)
}

#[tauri::command]
fn export_animation_source(destination: String, content: String) -> Result<ExportResult, String> {
    if content.len() as u64 > MAX_TEXT_BYTES {
        return Err("Animation source exceeds the export limit".into());
    }
    atomic_export(&destination, ".pani", content.as_bytes())
}

#[tauri::command]
fn export_animation_package(destination: String, bytes: Vec<u8>) -> Result<ExportResult, String> {
    if bytes.len() > MAX_ANIMATION_PACKAGE_BYTES || !bytes.starts_with(b"PLATANI\0") {
        return Err("Runtime export is not a bounded verified PANI container".into());
    }
    atomic_export(&destination, ".pani.bin", &bytes)
}

fn png_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    const SIGNATURE: &[u8; 8] = b"\x89PNG\r\n\x1a\n";
    if bytes.len() < 24 || &bytes[..8] != SIGNATURE || &bytes[12..16] != b"IHDR" {
        return None;
    }
    Some((
        u32::from_be_bytes(bytes[16..20].try_into().ok()?),
        u32::from_be_bytes(bytes[20..24].try_into().ok()?),
    ))
}

fn available_video_encoder() -> Result<String, String> {
    let output = Command::new("ffmpeg")
        .args(["-hide_banner", "-encoders"])
        .output()
        .map_err(|_| "FFmpeg is required for MP4 export. Install FFmpeg or configure the signed Studio sidecar.".to_string())?;
    if !output.status.success() {
        return Err("FFmpeg is installed but its encoder list could not be read".into());
    }
    let encoders = String::from_utf8_lossy(&output.stdout);
    #[cfg(target_os = "macos")]
    if encoders.contains("h264_videotoolbox") {
        return Ok("h264_videotoolbox".into());
    }
    if encoders.contains("libx264") {
        return Ok("libx264".into());
    }
    if encoders.contains(" mpeg4 ") {
        return Ok("mpeg4".into());
    }
    Err("FFmpeg does not provide an H.264 or MPEG-4 encoder usable by Studio".into())
}

fn export_animation_video_inner(
    destination: String,
    frames: Vec<Vec<u8>>,
    width: u32,
    height: u32,
    fps: u32,
) -> Result<ExportResult, String> {
    let started = Instant::now();
    if frames.is_empty() || frames.len() > MAX_VIDEO_FRAMES {
        return Err(format!(
            "MP4 export needs 1 to {MAX_VIDEO_FRAMES} rendered frames"
        ));
    }
    if !(1..=60).contains(&fps) || width == 0 || height == 0 || width > 3_840 || height > 2_160 {
        return Err("MP4 dimensions or frame rate exceed the Studio export limits".into());
    }
    let mut total = 0_usize;
    for frame in &frames {
        total = total.saturating_add(frame.len());
        if frame.len() > MAX_VIDEO_FRAME_BYTES
            || total > MAX_VIDEO_TOTAL_BYTES
            || png_dimensions(frame) != Some((width, height))
        {
            return Err("MP4 input contains an invalid, oversized, or mismatched PNG frame".into());
        }
    }
    let destination_path = Path::new(&destination);
    if !destination_path.is_absolute()
        || !destination_path
            .file_name()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.to_ascii_lowercase().ends_with(".mp4"))
    {
        return Err("MP4 destination must be an absolute .mp4 path selected by the user".into());
    }
    let parent = destination_path
        .parent()
        .ok_or("MP4 destination has no parent directory")?;
    let parent = fs::canonicalize(parent)
        .map_err(|error| format!("Cannot resolve MP4 export directory: {error}"))?;
    let frame_directory = tempfile::tempdir()
        .map_err(|error| format!("Cannot create MP4 frame workspace: {error}"))?;
    for (index, frame) in frames.iter().enumerate() {
        fs::write(
            frame_directory.path().join(format!("frame-{index:06}.png")),
            frame,
        )
        .map_err(|error| format!("Cannot stage rendered MP4 frame: {error}"))?;
    }
    let output_file = tempfile::NamedTempFile::new_in(&parent)
        .map_err(|error| format!("Cannot create safe MP4 output: {error}"))?;
    let encoder = available_video_encoder()?;
    let pattern = frame_directory.path().join("frame-%06d.png");
    let mut arguments = vec![
        "-hide_banner".to_string(),
        "-loglevel".to_string(),
        "error".to_string(),
        "-y".to_string(),
        "-framerate".to_string(),
        fps.to_string(),
        "-i".to_string(),
        pattern.to_string_lossy().into_owned(),
        "-c:v".to_string(),
        encoder.clone(),
    ];
    if encoder == "h264_videotoolbox" {
        arguments.extend(["-b:v".into(), "8M".into(), "-allow_sw".into(), "1".into()]);
    } else if encoder == "libx264" {
        arguments.extend([
            "-preset".into(),
            "medium".into(),
            "-crf".into(),
            "18".into(),
        ]);
    } else {
        arguments.extend(["-q:v".into(), "2".into()]);
    }
    arguments.extend([
        "-vf".into(),
        "pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p".into(),
        "-movflags".into(),
        "+faststart".into(),
        "-frames:v".into(),
        frames.len().to_string(),
        "-f".into(),
        "mp4".into(),
        output_file.path().to_string_lossy().into_owned(),
    ]);
    let output = Command::new("ffmpeg")
        .args(&arguments)
        .output()
        .map_err(|error| format!("Could not start FFmpeg: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "FFmpeg could not encode the rendered animation: {}",
            redact(String::from_utf8_lossy(&output.stderr).into_owned())
        ));
    }
    output_file
        .as_file()
        .sync_all()
        .map_err(|error| format!("Cannot sync MP4 output: {error}"))?;
    let file_name = destination_path
        .file_name()
        .ok_or("MP4 destination needs a file name")?;
    let final_path = parent.join(file_name);
    let size = output_file
        .as_file()
        .metadata()
        .map_err(|error| format!("Cannot inspect MP4 output: {error}"))?
        .len();
    output_file
        .persist(&final_path)
        .map_err(|error| format!("Cannot finalize MP4 export: {}", error.error))?;
    Ok(ExportResult {
        path: final_path.to_string_lossy().into_owned(),
        size,
        frames: Some(frames.len()),
        duration_ms: started.elapsed().as_millis(),
        encoder: Some(encoder),
    })
}

#[tauri::command]
async fn export_animation_video(
    destination: String,
    frames: Vec<Vec<u8>>,
    width: u32,
    height: u32,
    fps: u32,
) -> Result<ExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        export_animation_video_inner(destination, frames, width, height, fps)
    })
    .await
    .map_err(|error| format!("MP4 export worker failed: {error}"))?
}

fn command_summary(program: &str, args: &[&str]) -> (bool, String) {
    match Command::new(program).args(args).output() {
        Ok(output) => {
            let text = if output.status.success() {
                output.stdout
            } else {
                output.stderr
            };
            let summary = String::from_utf8_lossy(&text)
                .lines()
                .take(3)
                .collect::<Vec<_>>()
                .join(" · ");
            (
                output.status.success(),
                if summary.is_empty() {
                    format!("exit {}", output.status)
                } else {
                    summary
                },
            )
        }
        Err(error) => (false, error.to_string()),
    }
}

#[tauri::command]
fn toolchain_diagnostics() -> Vec<ToolchainDiagnostic> {
    let (rust, rust_summary) = command_summary("rustc", &["--version"]);
    let (node, node_summary) = command_summary("node", &["--version"]);
    let (xcode, xcode_summary) = command_summary("xcodebuild", &["-version"]);
    let (adb, adb_summary) = command_summary("adb", &["version"]);
    let (flutter, flutter_summary) = command_summary("flutter", &["--version"]);
    let (ffmpeg, ffmpeg_summary) = command_summary("ffmpeg", &["-version"]);
    vec![
        ToolchainDiagnostic { id: "rust".into(), label: "Rust desktop backend".into(), available: rust, summary: rust_summary, remediation: None },
        ToolchainDiagnostic { id: "node".into(), label: "Node project tools".into(), available: node, summary: node_summary, remediation: None },
        ToolchainDiagnostic { id: "xcode".into(), label: "Apple builds and Simulator".into(), available: xcode, summary: xcode_summary, remediation: (!xcode).then(|| "Install full Xcode on macOS, accept its license, and select it with xcode-select. Apple SDKs are required.".into()) },
        ToolchainDiagnostic { id: "adb".into(), label: "Android devices and emulators".into(), available: adb, summary: adb_summary, remediation: (!adb).then(|| "Install Android SDK Platform Tools and place adb on PATH.".into()) },
        ToolchainDiagnostic { id: "flutter".into(), label: "Flutter adapter".into(), available: flutter, summary: flutter_summary, remediation: (!flutter).then(|| "Install Flutter only when opening Flutter projects.".into()) },
        ToolchainDiagnostic { id: "ffmpeg".into(), label: "MP4 export encoder".into(), available: ffmpeg, summary: ffmpeg_summary, remediation: (!ffmpeg).then(|| "Install FFmpeg to export rendered animations as MP4. Public Studio builds require a separately licensed and signed FFmpeg sidecar decision.".into()) },
    ]
}

fn redact(mut value: String) -> String {
    for marker in ["sk_live_", "sk_test_", "CLERK_SECRET_KEY=", "DATABASE_URL="] {
        while let Some(start) = value.find(marker) {
            let end = value[start..]
                .find(char::is_whitespace)
                .map(|index| start + index)
                .unwrap_or(value.len());
            value.replace_range(start..end, "[REDACTED]");
        }
    }
    if value.len() > MAX_OUTPUT_BYTES {
        value.truncate(MAX_OUTPUT_BYTES);
        value.push_str("\n[output truncated by NJC Studio]");
    }
    value
}

#[tauri::command]
async fn run_task(
    root: String,
    task_id: String,
    state: State<'_, StudioState>,
) -> Result<TaskResult, String> {
    let root_path = canonical_root(&root)?;
    require_trust(&state, &root_path)?;
    let task = available_tasks(&root_path)
        .into_iter()
        .find(|task| task.id == task_id)
        .ok_or("Task is not provided by a detected adapter")?;
    let program = task.program.clone();
    let arguments = task.arguments.clone();
    let working_directory = task.working_directory.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let started = Instant::now();
        let output = Command::new(&program)
            .args(&arguments)
            .current_dir(&working_directory)
            .output()
            .map_err(|error| format!("Could not start task: {error}"))?;
        let combined = format!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        Ok(TaskResult {
            task_id,
            command: format!("{} {}", program, arguments.join(" ")),
            working_directory,
            success: output.status.success(),
            exit_code: output.status.code(),
            duration_ms: started.elapsed().as_millis(),
            output: redact(combined),
        })
    })
    .await
    .map_err(|error| format!("Task supervisor failed: {error}"))?
}

#[tauri::command]
fn git_status(root: String, state: State<'_, StudioState>) -> Result<String, String> {
    let root = canonical_root(&root)?;
    require_trust(&state, &root)?;
    let output = Command::new("git")
        .args([
            "-C",
            &root.to_string_lossy(),
            "status",
            "--short",
            "--branch",
        ])
        .output()
        .map_err(|error| format!("Cannot run Git: {error}"))?;
    if !output.status.success() {
        return Err(redact(String::from_utf8_lossy(&output.stderr).into_owned()));
    }
    Ok(redact(String::from_utf8_lossy(&output.stdout).into_owned()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(StudioState::default())
        .menu(|app| {
            use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

            let new_animation = MenuItem::with_id(
                app,
                "studio.new-animation",
                "New Animation…",
                true,
                Some("CmdOrCtrl+N"),
            )?;
            let open_workspace = MenuItem::with_id(
                app,
                "studio.open-workspace",
                "Open Workspace…",
                true,
                Some("CmdOrCtrl+O"),
            )?;
            let import_animation = MenuItem::with_id(
                app,
                "studio.import-animation",
                "Import Animation…",
                true,
                Some("CmdOrCtrl+Shift+I"),
            )?;
            let save = MenuItem::with_id(app, "studio.save", "Save", true, Some("CmdOrCtrl+S"))?;
            let toggle_autosave = MenuItem::with_id(
                app,
                "studio.toggle-autosave",
                "Toggle Autosave",
                true,
                None::<&str>,
            )?;
            let export_source = MenuItem::with_id(
                app,
                "studio.export-source",
                "Export Animation Source…",
                true,
                Some("CmdOrCtrl+Shift+E"),
            )?;
            let export_package = MenuItem::with_id(
                app,
                "studio.export-package",
                "Export Runtime Package…",
                true,
                None::<&str>,
            )?;
            let export_mp4 = MenuItem::with_id(
                app,
                "studio.export-mp4",
                "Export Rendered MP4…",
                true,
                None::<&str>,
            )?;
            let file = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_animation,
                    &open_workspace,
                    &import_animation,
                    &PredefinedMenuItem::separator(app)?,
                    &save,
                    &toggle_autosave,
                    &PredefinedMenuItem::separator(app)?,
                    &export_source,
                    &export_package,
                    &export_mp4,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                    #[cfg(not(target_os = "macos"))]
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;
            let edit = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;
            let view = Submenu::with_items(
                app,
                "View",
                true,
                &[&PredefinedMenuItem::fullscreen(app, None)?],
            )?;
            let window = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                ],
            )?;
            let menu = Menu::new(app)?;
            #[cfg(target_os = "macos")]
            menu.append(&Submenu::with_items(
                app,
                "NJC Studio",
                true,
                &[
                    &PredefinedMenuItem::about(app, None, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?)?;
            menu.append(&file)?;
            menu.append(&edit)?;
            menu.append(&view)?;
            menu.append(&window)?;
            Ok(menu)
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id.starts_with("studio.") {
                let _ = app.emit("studio-menu", id);
            }
        })
        .invoke_handler(tauri::generate_handler![
            default_workspace,
            inspect_workspace,
            trust_workspace,
            read_workspace_file,
            write_workspace_file,
            create_workspace_file,
            import_animation_file,
            export_animation_source,
            export_animation_package,
            export_animation_video,
            layout_blueprint_graph,
            toolchain_diagnostics,
            run_task,
            git_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NJC Studio");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn traversal_is_rejected() {
        assert!(safe_relative("../secret").is_err());
        assert!(safe_relative("platform/example.pani").is_ok());
    }

    #[test]
    fn detectors_use_markers_without_execution() {
        let directory = tempdir().unwrap();
        fs::write(directory.path().join("pnpm-workspace.yaml"), "packages: []").unwrap();
        fs::write(
            directory.path().join("pnpm-lock.yaml"),
            "lockfileVersion: 9",
        )
        .unwrap();
        let detections = detect(directory.path());
        assert_eq!(
            detections.first().map(|item| item.id.as_str()),
            Some("pnpm-monorepo")
        );
    }

    #[test]
    fn common_credentials_are_redacted() {
        assert!(!redact("DATABASE_URL=postgres://secret next".into()).contains("secret"));
    }

    #[test]
    fn creates_a_new_animation_inside_a_trusted_workspace() {
        let directory = tempdir().unwrap();
        let root = fs::canonicalize(directory.path()).unwrap();
        let state = StudioState::default();
        state.trusted_roots.lock().unwrap().insert(root.clone());
        let created = create_workspace_file_inner(
            root.to_string_lossy().into_owned(),
            "animations/first-test.pani".into(),
            "language 1\npackage first_test;\n".into(),
            &state,
        );
        assert!(created.is_ok());
        assert!(root.join("animations/first-test.pani").is_file());
    }

    #[test]
    fn source_exports_are_atomic_and_extension_scoped() {
        let directory = tempdir().unwrap();
        let destination = directory.path().join("headline.pani");
        let result = export_animation_source(
            destination.to_string_lossy().into_owned(),
            "language 1\npackage headline;\n".into(),
        )
        .unwrap();
        assert_eq!(result.size, 29);
        assert_eq!(
            fs::read_to_string(destination).unwrap(),
            "language 1\npackage headline;\n"
        );
        assert!(export_animation_source(
            directory
                .path()
                .join("headline.txt")
                .to_string_lossy()
                .into_owned(),
            "language 1\n".into(),
        )
        .is_err());
    }

    #[test]
    fn runtime_package_exports_require_the_verified_container_magic() {
        let directory = tempdir().unwrap();
        let destination = directory.path().join("headline.pani.bin");
        assert!(export_animation_package(
            destination.to_string_lossy().into_owned(),
            b"not-a-package".to_vec(),
        )
        .is_err());
        let result = export_animation_package(
            destination.to_string_lossy().into_owned(),
            b"PLATANI\0runtime".to_vec(),
        )
        .unwrap();
        assert_eq!(result.size, 15);
    }

    #[test]
    fn png_dimensions_only_accept_a_png_ihdr() {
        let mut header = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR".to_vec();
        header.extend(390_u32.to_be_bytes());
        header.extend(844_u32.to_be_bytes());
        assert_eq!(png_dimensions(&header), Some((390, 844)));
        assert_eq!(png_dimensions(b"not a png"), None);
    }

    #[test]
    fn video_export_rejects_invalid_limits_before_launching_an_encoder() {
        let directory = tempdir().unwrap();
        let result = export_animation_video_inner(
            directory
                .path()
                .join("invalid.mp4")
                .to_string_lossy()
                .into_owned(),
            vec![Vec::new()],
            390,
            844,
            0,
        );
        assert!(result.is_err_and(|message| message.contains("dimensions or frame rate")));
    }

    #[test]
    fn video_export_encodes_rendered_png_frames_when_ffmpeg_is_available() {
        if available_video_encoder().is_err() {
            return;
        }
        let directory = tempdir().unwrap();
        let frame_path = directory.path().join("frame.png");
        let generated = Command::new("ffmpeg")
            .args([
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=0x173e32:s=16x16",
                "-frames:v",
                "1",
                "-y",
                frame_path.to_string_lossy().as_ref(),
            ])
            .status()
            .unwrap();
        assert!(generated.success());
        let frame = fs::read(frame_path).unwrap();
        let destination = directory.path().join("rendered.mp4");
        let result = export_animation_video_inner(
            destination.to_string_lossy().into_owned(),
            vec![frame.clone(), frame],
            16,
            16,
            24,
        )
        .unwrap();
        assert_eq!(result.frames, Some(2));
        assert!(result.size > 0);
        assert!(destination.is_file());
    }

    fn layout_node(id: &str) -> BlueprintLayoutNode {
        BlueprintLayoutNode {
            id: id.into(),
            width: None,
            height: None,
        }
    }

    fn layout_edge(from: &str, to: &str) -> BlueprintLayoutEdge {
        BlueprintLayoutEdge {
            from_node_id: from.into(),
            to_node_id: to.into(),
        }
    }

    #[test]
    fn blueprint_layout_is_deterministic_and_layered() {
        let nodes = vec![
            layout_node("finish"),
            layout_node("start"),
            layout_node("work"),
        ];
        let edges = vec![layout_edge("work", "finish"), layout_edge("start", "work")];
        let result = layout_blueprint_graph_inner(nodes, edges).unwrap();
        let layers = result
            .positions
            .iter()
            .map(|position| (position.id.as_str(), position.layer))
            .collect::<HashMap<_, _>>();
        assert_eq!(layers.get("start"), Some(&0));
        assert_eq!(layers.get("work"), Some(&1));
        assert_eq!(layers.get("finish"), Some(&2));
        assert!(!result.cyclic);
    }

    #[test]
    fn blueprint_cycles_are_condensed_without_recursion() {
        let nodes = vec![layout_node("a"), layout_node("b"), layout_node("after")];
        let edges = vec![
            layout_edge("a", "b"),
            layout_edge("b", "a"),
            layout_edge("b", "after"),
        ];
        let result = layout_blueprint_graph_inner(nodes, edges).unwrap();
        let a = result
            .positions
            .iter()
            .find(|position| position.id == "a")
            .unwrap();
        let b = result
            .positions
            .iter()
            .find(|position| position.id == "b")
            .unwrap();
        let after = result
            .positions
            .iter()
            .find(|position| position.id == "after")
            .unwrap();
        assert!(result.cyclic);
        assert_eq!(a.layer, b.layer);
        assert!(after.layer > b.layer);
    }

    #[test]
    fn blueprint_layout_handles_thousands_of_nodes() {
        let count = 5_000;
        let nodes = (0..count)
            .map(|index| layout_node(&format!("node-{index:05}")))
            .collect::<Vec<_>>();
        let edges = (1..count)
            .map(|index| {
                layout_edge(
                    &format!("node-{:05}", index - 1),
                    &format!("node-{index:05}"),
                )
            })
            .collect::<Vec<_>>();
        let result = layout_blueprint_graph_inner(nodes, edges).unwrap();
        assert_eq!(result.positions.len(), count);
        assert_eq!(
            result.positions.last().map(|position| position.layer),
            Some(count - 1)
        );
        assert!(!result.cyclic);
    }

    #[test]
    fn blueprint_layout_rejects_duplicate_ids() {
        let result = layout_blueprint_graph_inner(
            vec![layout_node("duplicate"), layout_node("duplicate")],
            Vec::new(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn blueprint_layout_rejects_nonportable_ids() {
        let result =
            layout_blueprint_graph_inner(vec![layout_node("node with spaces")], Vec::new());
        assert!(result.is_err());
    }
}
