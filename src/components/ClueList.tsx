"use client";

import React, { useRef, useEffect, useState } from 'react';
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
    const [activeTab, setActiveTab] = useState<Direction>('across');

    useEffect(() => {
        // Skip auto-scroll on mobile to prevent keyboard focus issues
        const isMobile = window.innerWidth < 768;

        if (activeClueRef.current && !isMobile) {
            activeClueRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [activeWord]);

    // Sync active tab with active word direction
    useEffect(() => {
        if (activeWord?.direction) {
            setActiveTab(activeWord.direction);
        }
    }, [activeWord?.direction]);

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
                                <span className={styles.clueText}>
                                    {word.text} <span style={{ fontSize: '0.85em', fontWeight: 300, opacity: 0.8 }}>({word.answer.length} {word.answer.length === 1 ? 'letra' : 'letras'})</span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.clueListContainer}>
            {/* Mobile Tabs */}
            <div className={styles.tabContainer}>
                <button
                    className={`${styles.tab} ${activeTab === 'across' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('across')}
                >
                    Horizontais
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'down' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('down')}
                >
                    Verticais
                </button>
            </div>

            {/* Desktop: Show both sections */}
            <div className={styles.desktopView}>
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

            {/* Mobile: Show active tab only */}
            <div className={styles.mobileView}>
                <div className={styles.list}>
                    {activeTab === 'across'
                        ? clues.across.map(group => renderClueGroup(group, 'across'))
                        : clues.down.map(group => renderClueGroup(group, 'down'))
                    }
                </div>
            </div>
        </div>
    );
};
