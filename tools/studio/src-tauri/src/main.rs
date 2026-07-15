use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::Instant,
};
use tauri::State;
use walkdir::WalkDir;

const MAX_ENTRIES: usize = 2_500;
const MAX_TEXT_BYTES: u64 = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES: usize = 512 * 1024;

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
        return Err("File exceeds the Studio text limit".into());
    }
    let root = canonical_root(&root)?;
    require_trust(&state, &root)?;
    let child = canonical_child(&root, &relative)?;
    let current = fs::read(&child).map_err(|error| format!("Cannot read current file: {error}"))?;
    let current_hash = hex::encode(Sha256::digest(&current));
    if current_hash != expected_sha256 {
        return Err(
            "File changed outside the Studio; reload or resolve the conflict before saving".into(),
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
    vec![
        ToolchainDiagnostic { id: "rust".into(), label: "Rust desktop backend".into(), available: rust, summary: rust_summary, remediation: None },
        ToolchainDiagnostic { id: "node".into(), label: "Node project tools".into(), available: node, summary: node_summary, remediation: None },
        ToolchainDiagnostic { id: "xcode".into(), label: "Apple builds and Simulator".into(), available: xcode, summary: xcode_summary, remediation: (!xcode).then(|| "Install full Xcode on macOS, accept its license, and select it with xcode-select. Apple SDKs are required.".into()) },
        ToolchainDiagnostic { id: "adb".into(), label: "Android devices and emulators".into(), available: adb, summary: adb_summary, remediation: (!adb).then(|| "Install Android SDK Platform Tools and place adb on PATH.".into()) },
        ToolchainDiagnostic { id: "flutter".into(), label: "Flutter adapter".into(), available: flutter, summary: flutter_summary, remediation: (!flutter).then(|| "Install Flutter only when opening Flutter projects.".into()) },
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
        value.push_str("\n[output truncated by Studio]");
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
        .invoke_handler(tauri::generate_handler![
            default_workspace,
            inspect_workspace,
            trust_workspace,
            read_workspace_file,
            write_workspace_file,
            toolchain_diagnostics,
            run_task,
            git_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Platform Studio");
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
}
