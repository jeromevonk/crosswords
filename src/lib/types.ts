export type Direction = 'across' | 'down';

export interface Cell {
    row: number;
    col: number;
    value: string; // The user's input
    answer: string; // The correct letter
    isBlack: boolean; // True if it's a black square
    number?: number; // Clue number if applicable
    acrossClueNumber?: number; // The number of the across clue this cell belongs to
    downClueNumber?: number; // The number of the down clue this cell belongs to
    isActive: boolean; // Currently selected cell
    isHighlighted: boolean; // Part of the currently selected word
    isError?: boolean; // True if the current value is incorrect
}

export type GridData = Cell[][];

export interface Word {
    text: string;
    answer: string;
    row: number;
    col: number;
}

export interface ClueGroup {
    number: number;
    words: Word[];
}

export interface PuzzleData {
    id: string;
    from: string;
    rows: number;
    cols: number;
    grid: string[]; // Array of strings representing rows. '#' is black, letters are answers.
    clues: {
        across: ClueGroup[];
        down: ClueGroup[];
    };
}
