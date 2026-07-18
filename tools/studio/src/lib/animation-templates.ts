export type AnimationTemplateId = "headline" | "blank";

export const animationTemplates: Array<{ id: AnimationTemplateId; label: string; description: string }> = [
  { id: "headline", label: "Headline entrance", description: "A complete two-element entrance with a reduced-motion fallback." },
  { id: "blank", label: "Blank stage", description: "A minimal valid scene with one editable background and timeline." },
];

function identifier(value: string, fallback: string) {
  const normalized = value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^\d+/, "");
  return normalized || fallback;
}

function sceneIdentifier(value: string) {
  const normalized = identifier(value, "TestAnimation");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function createAnimationSource(name: string, template: AnimationTemplateId) {
  const packageName = identifier(name.toLowerCase(), "test_animation");
  const sceneName = sceneIdentifier(name);
  if (template === "blank") {
    return `language 1
package ${packageName};

scene ${sceneName} {
  component background rect {
    x: 0dp;
    y: 0dp;
    width: 390dp;
    height: 844dp;
    fill: "#F3EFE7";
    cornerRadius: 42dp;
  }

  timeline entrance 300ms {
    track background.opacity {
      0ms: 0;
      300ms: 1 ease outCubic;
    }
  }
}
`;
  }
  return `language 1
package ${packageName};

scene ${sceneName} {
  input accent: string = "#2D6A55";

  component background rect {
    x: 0dp;
    y: 0dp;
    width: 390dp;
    height: 844dp;
    fill: "#F3EFE7";
    cornerRadius: 42dp;
  }

  component accentBar rect {
    x: 28dp;
    y: 224dp;
    width: 54dp;
    height: 8dp;
    fill: "\${accent}";
    cornerRadius: 4dp;
    opacity: 0;
  }

  component headline text {
    text: "Your first NJC animation";
    x: 28dp;
    y: 258dp;
    width: 330dp;
    opacity: 0;
    scale: 0.94;
    color: "#17231F";
  }

  component caption text {
    text: "Edit this copy, timing and color in Code, Visual or Timeline mode.";
    x: 28dp;
    y: 350dp;
    width: 330dp;
    opacity: 0;
    color: "#52605B";
  }

  timeline entrance 720ms {
    track accentBar.opacity {
      0ms: 0;
      180ms: 1 ease outCubic;
    }
    track headline.opacity {
      100ms: 0;
      420ms: 1 ease outCubic;
    }
    track headline.scale {
      100ms: 0.94;
      620ms: 1 ease spring;
    }
    track caption.opacity {
      260ms: 0;
      720ms: 1 ease outCubic;
    }
  }

  timeline reduced 140ms {
    track accentBar.opacity {
      0ms: 0;
      140ms: 1 ease linear;
    }
    track headline.opacity {
      0ms: 0;
      140ms: 1 ease linear;
    }
    track caption.opacity {
      0ms: 0;
      140ms: 1 ease linear;
    }
  }

  reducedMotion: reduced;
}
`;
}
