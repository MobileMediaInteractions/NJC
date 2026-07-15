# Renderer architecture

The chosen milestone is hybrid: engine frames describe typed nodes; DOM renders engine-owned nodes and `DomHostPropertyAdapter` applies a narrow allowlist to host-owned views. Unsupported properties fail semantic analysis. This avoids claiming arbitrary native-view animation.

Skia is the preferred mature 2D candidate for React Native, while platform-native host adapters remain necessary for navigation and shared application views. wgpu is deferred because this milestone does not justify a second GPU stack. Native/TV/Roku renderers need measured prototypes before selection; see ADR 0003.
