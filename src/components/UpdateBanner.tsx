import { ArrowSquareOut, X } from "@phosphor-icons/react";

interface Props {
  version: string;
  url: string;
  onDownload: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ version, url, onDownload, onDismiss }: Props) {
  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span className="update-dot" aria-hidden />
      <span className="update-text">
        MDora <strong>v{version}</strong> is available.
      </span>
      <button
        className="update-link"
        onClick={onDownload}
        title={url}
      >
        Download
        <ArrowSquareOut size={12} weight="bold" />
      </button>
      <button
        className="update-close"
        onClick={onDismiss}
        aria-label="Dismiss update notification"
        title="Dismiss"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
