import './PortraitOrientationOverlay.css'

function RotateIcon() {
  return (
    <svg
      className="portrait-overlay__icon"
      width="72"
      height="72"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.75 5.5h6.5c1.52 0 2.75 1.23 2.75 2.75v7.5c0 1.52-1.23 2.75-2.75 2.75h-6.5C7.23 18.5 6 17.27 6 15.75v-7.5C6 6.73 7.23 5.5 8.75 5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.3 10.2c-.2 1.2 0 2.5.7 3.6 1.3 2.1 3.9 3 6.2 2.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.7 17.6 12 16l-2.1-.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PortraitOrientationOverlay() {
  return (
    <div className="portrait-overlay" role="dialog" aria-label="Rotate device">
      <div className="portrait-overlay__card">
        <RotateIcon />
        <div className="portrait-overlay__title">Rotate your device</div>
        <div className="portrait-overlay__subtitle">
          Rotate your device for the best experience
        </div>
      </div>
    </div>
  )
}

