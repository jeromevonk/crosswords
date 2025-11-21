"use client";

import React, { useRef, useEffect } from 'react';
import styles from './ClueList.module.css';
import { ClueGroup, Direction, Word } from '@/lib/types';

interface ClueListProps {
    clues: {
        across: ClueGroup[];
        down: ClueGroup[];
    };
    activeWord?: { row: number; col: number; direction: Direction } | null;
    onClueClick: (clueNumber: number, direction: Direction, word: Word) => void;
}

export const ClueList: React.FC<ClueListProps> = ({ clues, activeWord, onClueClick }) => {
    const activeClueRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeClueRef.current) {
            activeClueRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activeWord]);

    const renderClueGroup = (clueGroup: ClueGroup, direction: Direction) => {
        return (
            <div key={`${direction}-${clueGroup.number}`} className={styles.clueGroupContainer}>
                <div className={styles.clueNumber}>{clueGroup.number}</div>
                <div className={styles.wordsContainer}>
                    {clueGroup.words.map((word, idx) => {
                        const isActive = activeWord?.row === word.row && activeWord?.col === word.col && activeWord?.direction === direction;

                        return (
                            <div
                                key={`${direction}-${clueGroup.number}-${idx}`}
                                ref={isActive ? activeClueRef : null}
                                className={`${styles.clueItem} ${isActive ? styles.clueItemActive : ''}`}
                                onClick={() => onClueClick(clueGroup.number, direction, word)}
                            >
                                <span className={styles.clueText}>{word.text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.clueListContainer}>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Horizontais</h3>
                <div className={styles.list}>
                    {clues.across.map(group => renderClueGroup(group, 'across'))}
                </div>
            </div>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Verticais</h3>
                <div className={styles.list}>
                    {clues.down.map(group => renderClueGroup(group, 'down'))}
                </div>
            </div>
        </div>
    );
};
