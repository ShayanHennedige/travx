"use client";

interface RoomQuantitySelectorProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function RoomQuantitySelector({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 20,
}: RoomQuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-surface-800 light:bg-white border border-surface-600 light:border-surface-300 rounded-lg">
      <div>
        <p className="font-medium text-surface-100 light:text-surface-900">{label}</p>
        <p className="text-sm text-surface-400 light:text-surface-500">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-full border-2 border-surface-500 light:border-surface-300 flex items-center justify-center text-surface-300 light:text-surface-600 hover:border-primary-500 hover:text-primary-400 light:hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-surface-500 disabled:hover:text-surface-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="w-8 text-center text-lg font-semibold text-surface-100 light:text-surface-900">
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 rounded-full border-2 border-surface-500 light:border-surface-300 flex items-center justify-center text-surface-300 light:text-surface-600 hover:border-primary-500 hover:text-primary-400 light:hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-surface-500 disabled:hover:text-surface-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
