import { Answer, Question } from "@/constants/practicepage-data";
import AnswerOption from "./AnswerOption";

interface AnswerOptionsProps {
  question: Question;
  selectedAnswer: string | null;
  answered: boolean;
  onSelectAnswer: (answerId: string) => void;
}

export default function AnswerOptions({
  question,
  selectedAnswer,
  answered,
  onSelectAnswer,
}: AnswerOptionsProps) {
  return (
    <div className="min-w-0 space-y-2">
      {question.answers.map((answer: Answer) => (
        <AnswerOption
          key={answer.id}
          answer={answer}
          isSelected={selectedAnswer === answer.id}
          isAnswered={answered}
          onSelect={() =>
            onSelectAnswer(answer.id)
          }
        />
      ))}
    </div>
  );
}