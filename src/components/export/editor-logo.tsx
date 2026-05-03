import React from "react";
import type { ExportTarget } from "../../data/reframe-demo";

type EditorLogoProps = {
  targetId: ExportTarget["id"];
  className?: string;
};

const editorLogoSrc: Record<ExportTarget["id"], string> = {
  capcut: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Capcut-icon.svg",
  "premiere-pro": "https://main--cc--adobecom.aem.live/cc-shared/assets/img/product-icons/svg/premiere-pro.svg",
  "davinci-resolve": "https://commons.wikimedia.org/wiki/Special:Redirect/file/DaVinci_Resolve_17_logo.svg",
};

const editorLogoAlt: Record<ExportTarget["id"], string> = {
  capcut: "CapCut",
  "premiere-pro": "Adobe Premiere Pro",
  "davinci-resolve": "DaVinci Resolve",
};

export function EditorLogo({ targetId, className }: EditorLogoProps) {
  return (
    <img
      src={editorLogoSrc[targetId]}
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
      data-testid={`editor-logo-${targetId}`}
      title={editorLogoAlt[targetId]}
    />
  );
}
