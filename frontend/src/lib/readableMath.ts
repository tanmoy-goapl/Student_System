const MATH_COMMANDS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ",
  epsilon: "ε", varepsilon: "ε", theta: "θ", vartheta: "θ", lambda: "λ", Lambda: "Λ",
  mu: "μ", pi: "π", Pi: "Π", sigma: "σ", Sigma: "Σ", phi: "φ", varphi: "φ",
  omega: "ω", Omega: "Ω", ell: "ℓ", infty: "∞", partial: "∂", nabla: "∇",
  cdot: "·", cdots: "…", dots: "…", ldots: "…", vdots: "⋮", ddots: "⋱",
  times: "×", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", approx: "≈",
  pm: "±", to: "→", rightarrow: "→", leftarrow: "←", in: "∈", notin: "∉",
  top: "T", bot: "⊥", vert: "|", Vert: "||", sim: "∼", equiv: "≡", simeq: "≃",
  sum: "Σ", prod: "Π", min: "min", max: "max", argmin: "arg min", argmax: "arg max",
  exp: "exp", log: "log", ln: "ln", sin: "sin", cos: "cos", tan: "tan", lim: "lim",
  quad: " ", qquad: " ", left: "", right: "", middle: "|", displaystyle: "", textstyle: "",
  scriptstyle: "", scriptsize: "", limits: "", nolimits: "", circ: "∘", propto: "∝",
};

const SUPER: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", T: "ᵀ", n: "ⁿ",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ",
  l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
};

function formatScript(marker: "^" | "_", value: string): string {
  const compact = value.replace(/\s+/g, "");
  const map = marker === "^" ? SUPER : SUB;
  if (compact && [...compact].every(char => map[char])) {
    return [...compact].map(char => map[char]).join("");
  }
  const clean = value.trim();
  if (marker === "_") {
    return "[" + clean + "]";
  }
  return clean.startsWith("(") && clean.endsWith(")") ? "^" + clean : "^(" + clean + ")";
}

function convertMathExpression(input: string): string {
  let output = input;
  output = output.replace(/\\\\/g, "; ");
  output = output.replace(/\\begin\{(?:b|p)?matrix\}/g, "[");
  output = output.replace(/\\end\{(?:b|p)?matrix\}/g, "]");

  for (let pass = 0; pass < 4; pass += 1) {
    const before = output;
    output = output.replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, numerator, denominator) => "(" + numerator + ") / (" + denominator + ")");
    output = output.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, value) => "sqrt(" + value + ")");
    output = output.replace(/\\(?:hat|widehat)\s*\{([^{}]*)\}/g, (_, value) => value + "̂");
    output = output.replace(/\\(?:bar|overline)\s*\{([^{}]*)\}/g, (_, value) => value + "̄");
    output = output.replace(/\\vec\s*\{([^{}]*)\}/g, (_, value) => value + "⃗");
    output = output.replace(/\\(?:tilde|widetilde)\s*\{([^{}]*)\}/g, (_, value) => value + "̃");
    output = output.replace(/\\(?:mathbf|boldsymbol|mathrm|mathit|mathsf|mathtt|mathbb|mathcal|mathscr|text|textrm|textbf|operatorname|underline|boxed)\s*\{([^{}]*)\}/g, "$1");
    if (before === output) break;
  }

  output = output.replace(/\\([A-Za-z]+|[,;!])/g, (_, command) => MATH_COMMANDS[command] ?? "");
  output = output.replace(/\\([{}_$%|])/g, "$1");
  output = output.replace(/\^\{([^{}]*)\}/g, (_, value) => formatScript("^", value));
  output = output.replace(/_\{([^{}]*)\}/g, (_, value) => formatScript("_", value));
  output = output.replace(/\^([A-Za-z0-9]+)/g, (_, value) => formatScript("^", value));
  output = output.replace(/_([A-Za-z0-9]+)/g, (_, value) => formatScript("_", value));
  output = output.replace(/[{}]/g, "");
  output = output.replace(/&(?=\s*[=<>+\-])/g, " ");
  output = output.replace(/&(?=\s*\\)/g, " ");
  output = output.replace(/&/g, ", ");
  return output.replace(/[ \t]+/g, " ");
}

export function normalizeReadableMath(text: string): string {
  if (!text || (!text.includes("\\") && !text.includes("$"))) return text;

  const segments = text.split(/(\x60\x60\x60[\s\S]*?\x60\x60\x60)/g);
  return segments.map((segment, index) => {
    if (index % 2 === 1) return segment;
    let normalized = segment;
    normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
    normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
    normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
    normalized = normalized.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, "$1");
    return convertMathExpression(normalized);
  }).join("");
}
