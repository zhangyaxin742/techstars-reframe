import { describe, expect, it } from "vitest";
import { mvpTimelineSegments } from "./data";
import {
  serializeMvpJsonPackage,
  serializeMvpMarkdownBrief,
  serializeMvpScript,
  serializeMvpShotListCsv,
} from "./export";

const exportInput = {
  workspaceSlug: "petite-outdoors",
  projectSlug: "preorder-launch",
  segments: mvpTimelineSegments,
};

describe("MVP export serializers", () => {
  it("serializes an edited Markdown brief", () => {
    const brief = serializeMvpMarkdownBrief(exportInput);

    expect(brief).toContain("# Petite Outdoors Content Brief");
    expect(brief).toContain("Workspace: petite-outdoors");
    expect(brief).toContain("## Script");
    expect(brief).toContain("Regular hiking pants never fit my frame");
    expect(brief).toContain("Shot to film - movement proof (to film)");
  });

  it("serializes a structured JSON package", () => {
    const parsed = JSON.parse(serializeMvpJsonPackage(exportInput));

    expect(parsed).toMatchObject({
      workspaceSlug: "petite-outdoors",
      projectSlug: "preorder-launch",
      brand: "Petite Outdoors",
    });
    expect(parsed.script).toContain(
      "Regular hiking pants never fit my frame, so I built the pair I needed."
    );
    expect(parsed.shotList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Shot to film - movement proof",
          status: "to film",
        }),
      ])
    );
  });

  it("serializes CSV shot list and copyable script", () => {
    const csv = serializeMvpShotListCsv(exportInput);
    const script = serializeMvpScript(exportInput);

    expect(csv).toContain("order,label,status,asset,start_ms,end_ms");
    expect(csv).toContain("Shot to film - movement proof,to film");
    expect(script).toContain("Join the preorder list");
    expect(script).not.toContain("CapCut");
  });
});
