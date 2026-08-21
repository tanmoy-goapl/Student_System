import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.chatbot.chat_prompts import apply_role_guardrails


class ChatGuardrailTests(unittest.TestCase):
    def test_all_roles_allow_general_informational_questions(self):
        questions = [
            "What is the capital of France?",
            "What is a peacock?",
            "Explain how a solar eclipse happens.",
            "How do I cook rice?",
            "What is the difference between a comet and an asteroid?",
        ]
        for role in ("student", "professor", "admin"):
            for question in questions:
                with self.subTest(role=role, question=question):
                    self.assertEqual(apply_role_guardrails(role, question), "")

    def test_all_roles_allow_academic_questions(self):
        question = "Explain the difference between stacks and queues in a data structure course."
        for role in ("student", "professor", "admin"):
            with self.subTest(role=role):
                self.assertEqual(apply_role_guardrails(role, question), "")

    def test_blocks_direct_joke_requests_for_all_roles(self):
        for role in ("student", "professor", "admin"):
            with self.subTest(role=role):
                self.assertTrue(apply_role_guardrails(role, "Tell me a bad joke."))

    def test_blocks_direct_song_requests_for_all_roles(self):
        for role in ("student", "professor", "admin"):
            with self.subTest(role=role):
                self.assertTrue(apply_role_guardrails(role, "Sing me a song."))

    def test_blocks_other_entertainment_generation(self):
        self.assertTrue(apply_role_guardrails("student", "Write me a poem."))
        self.assertTrue(apply_role_guardrails("professor", "Give me a riddle."))
        self.assertTrue(apply_role_guardrails("admin", "Roleplay as a pirate."))

    def test_allows_informational_song_question(self):
        self.assertEqual(
            apply_role_guardrails("student", "Explain the history of songwriting."),
            "",
        )

    def test_allows_basic_arithmetic(self):
        self.assertEqual(apply_role_guardrails("student", "What is 2 + 2?"), "")


if __name__ == "__main__":
    unittest.main()
