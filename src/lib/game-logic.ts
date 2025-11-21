import { GridData, Cell, PuzzleData } from './types';

export const initializeGrid = (puzzle: PuzzleData): GridData => {
    const grid: GridData = [];

    for (let r = 0; r < puzzle.rows; r++) {
        const row: Cell[] = [];
        const rowString = puzzle.grid[r] || '';

        for (let c = 0; c < puzzle.cols; c++) {
            const char = rowString[c] || '#';
            const isBlack = char === '#';

            // Find if this cell starts a word
            let number: number | undefined;

            // Check all across words
            for (const clueGroup of puzzle.clues.across) {
                for (const word of clueGroup.words) {
                    if (word.row === r && word.col === c) {
                        number = clueGroup.number;
                        break;
                    }
                }
                if (number) break;
            }

            // Check all down words if no across number found
            if (!number) {
                for (const clueGroup of puzzle.clues.down) {
                    for (const word of clueGroup.words) {
                        if (word.row === r && word.col === c) {
                            number = clueGroup.number;
                            break;
                        }
                    }
                    if (number) break;
                }
            }

            // Determine which clue this cell belongs to
            let acrossClueNumber: number | undefined;
            let downClueNumber: number | undefined;

            if (!isBlack) {
                // Find the across clue number: look left until we find the start or a black square
                let cTemp = c;
                while (cTemp >= 0) {
                    if (puzzle.grid[r][cTemp] === '#') break;

                    // Check if this position starts any across word
                    for (const clueGroup of puzzle.clues.across) {
                        for (const word of clueGroup.words) {
                            if (word.row === r && word.col === cTemp) {
                                acrossClueNumber = clueGroup.number;
                                break;
                            }
                        }
                        if (acrossClueNumber) break;
                    }
                    if (acrossClueNumber) break;
                    cTemp--;
                }

                // Find the down clue number: look up
                let rTemp = r;
                while (rTemp >= 0) {
                    if (puzzle.grid[rTemp] && puzzle.grid[rTemp][c] === '#') break;

                    // Check if this position starts any down word
                    for (const clueGroup of puzzle.clues.down) {
                        for (const word of clueGroup.words) {
                            if (word.row === rTemp && word.col === c) {
                                downClueNumber = clueGroup.number;
                                break;
                            }
                        }
                        if (downClueNumber) break;
                    }
                    if (downClueNumber) break;
                    rTemp--;
                }
            }

            row.push({
                row: r,
                col: c,
                value: '',
                answer: isBlack ? '' : char,
                isBlack,
                number,
                acrossClueNumber,
                downClueNumber,
                isActive: false,
                isHighlighted: false,
            });
        }
        grid.push(row);
    }

    return grid;
};

// Helper to get all words as a flat list for the clue panel
export const getAllWords = (puzzle: PuzzleData) => {
    const across = puzzle.clues.across.flatMap(group =>
        group.words.map(word => ({
            ...word,
            number: group.number,
            direction: 'across' as const
        }))
    );

    const down = puzzle.clues.down.flatMap(group =>
        group.words.map(word => ({
            ...word,
            number: group.number,
            direction: 'down' as const
        }))
    );

    return { across, down };
};
