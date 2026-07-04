import { BoardColorObj } from "../../types/chess";

interface BoardColorPreset extends BoardColorObj {
    id: string;
    label: string;
}

// A small, curated set of board palettes. The first entry (Amber) is the app default.
export const BOARD_COLOR_PRESETS: BoardColorPreset[] = [
    { id: "amber", label: "Amber", light: "hsl(25, 100%, 89%)", dark: "hsl(25, 100%, 36%)" },
    { id: "gray", label: "Slate", light: "hsl(217, 21%, 96%)", dark: "hsl(217, 21%, 27%)" },
    { id: "blue", label: "Ocean", light: "hsl(193, 100%, 90%)", dark: "hsl(193, 100%, 29%)" },
    { id: "green", label: "Forest", light: "hsl(86, 100%, 89%)", dark: "hsl(86, 100%, 25%)" },
    { id: "purple", label: "Orchid", light: "hsl(295, 100%, 95%)", dark: "hsl(295, 100%, 36%)" },
];

export const DEFAULT_BOARD_COLOR: BoardColorObj = {
    light: BOARD_COLOR_PRESETS[0].light,
    dark: BOARD_COLOR_PRESETS[0].dark,
};

interface BoardColorProps {
    onChangeColor: (selectedColor: BoardColorObj) => void;
    selectedColor: BoardColorObj;
}

const BoardColor: React.FC<BoardColorProps> = ({ onChangeColor, selectedColor }) => {
    return (
        <div className="w-full">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Board colour
            </p>
            <div className="flex flex-wrap justify-center gap-2">
                {BOARD_COLOR_PRESETS.map(({ id, label, light, dark }) => {
                    const isSelected = light === selectedColor.light && dark === selectedColor.dark;
                    return (
                        <button
                            key={id}
                            type="button"
                            title={label}
                            aria-label={label}
                            aria-pressed={isSelected}
                            onClick={() => onChangeColor({ light, dark })}
                            className={`grid h-9 w-9 grid-cols-2 grid-rows-2 overflow-hidden rounded-md ring-2 ring-offset-1 ring-offset-transparent transition ${
                                isSelected
                                    ? "ring-blue-500"
                                    : "ring-transparent hover:ring-gray-400 dark:hover:ring-gray-500"
                            }`}
                        >
                            <span style={{ backgroundColor: light }} />
                            <span style={{ backgroundColor: dark }} />
                            <span style={{ backgroundColor: dark }} />
                            <span style={{ backgroundColor: light }} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BoardColor;
