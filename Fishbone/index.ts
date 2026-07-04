import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { FishboneEditor } from "./editor";
import {
  parseCauses,
  parseCategoriesList,
  parseLegacyDiagram,
  serializeCauses,
  serializeCategories,
  defaultStyle,
  DEFAULT_CATEGORIES,
  FishboneModel,
  StyleConfig,
} from "./types";

export class Fishbone implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container: HTMLDivElement;
  private editor!: FishboneEditor;
  private notifyOutputChanged!: () => void;

  // Last raw values seen from (or acknowledged by) the host — updateView only
  // reloads the model when the host supplies something different.
  private lastCausesRaw = "";
  private lastCategoriesRaw = "";
  private lastProblemRaw = "";

  // Canonical serialized state returned by getOutputs.
  private causesJson = "";
  private categoriesJson = "";
  private problemText = "";
  private pngDataUri = "";

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.notifyOutputChanged = notifyOutputChanged;

    // ask the host to report size changes (canvas apps)
    if (context.mode.trackContainerResize) {
      context.mode.trackContainerResize(true);
    }

    this.editor = new FishboneEditor(this.container, {
      onChange: (model: FishboneModel) => {
        this.causesJson = serializeCauses(model.causes);
        this.categoriesJson = serializeCategories(model.categories);
        this.problemText = model.problem;
        // treat our own canonical output as acknowledged, so the host echoing
        // it back does not trigger a reload
        this.lastCausesRaw = this.causesJson;
        this.lastCategoriesRaw = this.categoriesJson;
        this.lastProblemRaw = this.problemText;
        this.notifyOutputChanged();
      },
      onPngReady: (dataUri: string) => {
        this.pngDataUri = dataUri;
        this.notifyOutputChanged();
      },
    });

    this.editor.setStyle(this.readStyle(context));
    this.editor.setModel(this.readModel(context));
    this.applyReadOnly(context);
    this.applySize(context);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const p = context.parameters;
    const causesRaw = p.causeData.raw ?? "";
    const catsRaw = p.diagramCategories?.raw ?? "";
    const probRaw = p.problem?.raw ?? "";
    // only reload from the host if a change came from outside this control
    if (
      causesRaw !== this.lastCausesRaw ||
      catsRaw !== this.lastCategoriesRaw ||
      probRaw !== this.lastProblemRaw
    ) {
      this.editor.setModel(this.readModel(context));
    }
    this.editor.setStyle(this.readStyle(context));
    this.applyReadOnly(context);
    this.applySize(context);
  }

  public getOutputs(): IOutputs {
    return {
      causeData: this.causesJson,
      diagramCategories: this.categoriesJson,
      problem: this.problemText,
      pngExport: this.pngDataUri,
    };
  }

  public destroy(): void {
    if (this.editor) this.editor.destroy();
  }

  /**
   * Build the model from the three data parameters. A legacy combined
   * diagramData blob bound to causeData is migrated transparently (its causes
   * always; its problem/categories only when the dedicated fields are empty).
   */
  private readModel(context: ComponentFramework.Context<IInputs>): FishboneModel {
    const p = context.parameters;
    const causesRaw = p.causeData.raw ?? "";
    const catsRaw = p.diagramCategories?.raw ?? "";
    const probRaw = p.problem?.raw ?? "";

    this.lastCausesRaw = causesRaw;
    this.lastCategoriesRaw = catsRaw;
    this.lastProblemRaw = probRaw;

    const legacy = parseLegacyDiagram(causesRaw);
    const causes = parseCauses(causesRaw);
    let categories = parseCategoriesList(catsRaw);
    if (!categories.length && legacy.categories) categories = legacy.categories;
    if (!categories.length) categories = DEFAULT_CATEGORIES.slice();
    const problem = probRaw.trim() !== "" ? probRaw : legacy.problem ?? "";

    this.causesJson = serializeCauses(causes);
    this.categoriesJson = serializeCategories(categories);
    this.problemText = problem;

    return { problem, categories, causes };
  }

  /** Build a StyleConfig from the styling input properties (falling back to defaults). */
  private readStyle(context: ComponentFramework.Context<IInputs>): StyleConfig {
    const s = defaultStyle();
    const p = context.parameters;
    const pick = (v: string | null | undefined, fallback: string): string => {
      const t = (v ?? "").trim();
      return t !== "" ? t : fallback;
    };
    return {
      fontFamily: pick(p.fontFamily?.raw, s.fontFamily),
      diagramColor: pick(p.diagramColor?.raw, s.diagramColor),
      backgroundColor: pick(p.backgroundColor?.raw, s.backgroundColor),
      effectLabel: pick(p.effectLabel?.raw, s.effectLabel),
      statusColors: {
        Hypothesis: pick(p.hypothesisColor?.raw, s.statusColors.Hypothesis),
        Confirmed: pick(p.confirmedColor?.raw, s.statusColors.Confirmed),
        Rejected: pick(p.rejectedColor?.raw, s.statusColors.Rejected),
      },
    };
  }

  private applyReadOnly(context: ComponentFramework.Context<IInputs>): void {
    const disabled = context.mode.isControlDisabled === true;
    const ro = context.parameters.readOnly?.raw === true;
    this.editor.setReadOnly(disabled || ro);
  }

  private applySize(context: ComponentFramework.Context<IInputs>): void {
    const w = context.mode.allocatedWidth;
    const h = context.mode.allocatedHeight;
    this.editor.resize(w, h);
  }
}
