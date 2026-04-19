export default function SignIn() {
    const handleSignIn = async () => {
        window.location.href = "http://127.0.0.1:8000/auth/login";
    };

    return (
        <div className="center">
            <h1>CollectionBrainz</h1>
            <h2>Sign in</h2>
            <button onClick={handleSignIn}>
                Continue with MusicBrainz
            </button>
        </div>
    );
}