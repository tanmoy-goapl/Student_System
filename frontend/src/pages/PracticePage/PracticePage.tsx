'use client'

import { useState } from "react";
import QuestionHeader from "../../components/practicepage/Main/QuestionHeader";
import QuestionContent from "../../components/practicepage/Main/QuestionContent";
import AnswerOptions from "../../components/practicepage/Main/AnswerOptions";
import ActionButtons from "../../components/practicepage/Main/ActionButtons";
import AIHelpSection from "../../components/practicepage/Main/AIHelpSection";
import { SAMPLE_QUESTIONS } from "@/constants/practicepage-data";
import PracticeSidebar from "@/components/practicepage/Right/Practicesidebar";

export interface PracticePageProps {
    onAnswerSubmit?: (
        questionId: number,
        answerId: string,
        isCorrect: boolean
    ) => void;
    onSkip?: (questionId: number) => void;
    onHintRequest?: (questionId: number) => void;
    onAIHelp?: (questionId: number, query: string) => void;
}

export default function PracticePage({
    onAnswerSubmit,
    onSkip,
    onHintRequest,
    onAIHelp,
}: PracticePageProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] =
        useState(0);
    const [selectedAnswer, setSelectedAnswer] =
        useState<string | null>(null);
    const [answered, setAnswered] = useState(false);
    const [aiQuery, setAiQuery] = useState("");
    const [showAIHelp, setShowAIHelp] = useState(false);

    const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex];

    const handleAnswerSelect = (answerId: string) => {
        if (!answered) {
            setSelectedAnswer(answerId);
        }
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer) {
            const isCorrect =
                currentQuestion.answers.find(
                    (a) => a.id === selectedAnswer
                )?.isCorrect || false;

            setAnswered(true);
            onAnswerSubmit?.(
                currentQuestion.id,
                selectedAnswer,
                isCorrect
            );
        }
    };

    const handleHint = () => {
        onHintRequest?.(currentQuestion.id);
    };

    const handleSkip = () => {
        setSelectedAnswer(null);
        setAnswered(false);
        if (
            currentQuestionIndex <
            SAMPLE_QUESTIONS.length - 1
        ) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
        onSkip?.(currentQuestion.id);
    };

    const handleAIHelp = (query: string) => {
        onAIHelp?.(currentQuestion.id, query);
        setAiQuery("");
    };

    const handleNextQuestion = () => {
        if (
            currentQuestionIndex <
            SAMPLE_QUESTIONS.length - 1
        ) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setAnswered(false);
            setShowAIHelp(false);
        }
    };

    return (
        <div className="flex gap-2 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-4 space-y-4">
            <div className="flex-1 space-y-4">
                <QuestionHeader question={currentQuestion} />
                <QuestionContent
                    question={currentQuestion}
                />
                <AnswerOptions
                    question={currentQuestion}
                    selectedAnswer={selectedAnswer}
                    answered={answered}
                    onSelectAnswer={handleAnswerSelect}
                />
                <ActionButtons
                    answered={answered}
                    selectedAnswer={selectedAnswer}
                    onSubmit={handleSubmitAnswer}
                    onHint={handleHint}
                    onSkip={handleSkip}
                    onNext={
                        answered
                            ? handleNextQuestion
                            : undefined
                    }
                    canProceed={
                        currentQuestionIndex <
                        SAMPLE_QUESTIONS.length - 1
                    }
                />

                <AIHelpSection
                    query={aiQuery}
                    onQueryChange={setAiQuery}
                    onSubmitQuery={handleAIHelp}
                />

            </div>

            <div className="w-[20vw]">
                <PracticeSidebar />
            </div>
        </div>
    );
}