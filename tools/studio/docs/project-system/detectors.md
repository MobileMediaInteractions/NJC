# Project detection and tasks

The native detector recognizes the repository animation platform, pnpm monorepos, Turborepo, Next.js, Expo/React Native, Rust/Cargo, CMake, Git and GitHub Actions from bounded marker checks. Each result contains a confidence score and evidence visible in the Devices panel.

Detection never runs commands. Workspace trust gates every write, Git invocation and project task.

The initial repository adapter provides these explicit tasks when their required paths exist:

| Task | Command |
| --- | --- |
| Platform vertical slice | `pnpm --dir platform demo` |
| Platform verification | `pnpm --dir platform check` |
| Example application build | `pnpm --dir apps/platform-playground build` |
| Studio verification | `pnpm --dir tools/studio check` |
| Newspaper web build | `pnpm --dir apps/web build` |

Arguments are stored separately from the executable and are never concatenated into a shell invocation. A future detector plugin API will contribute similarly typed task definitions, required environment diagnostics and capability prompts.
