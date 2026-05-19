export default function Greeting() {
    const username = localStorage.getItem("user_name") || "User";
    return (
        <div className="py-2">
            <h3 className="text-3xl font-bold">Hi {username}! 👋</h3>
            <p>Here's your AI-powered study command center for today.</p>
        </div>
    );
}