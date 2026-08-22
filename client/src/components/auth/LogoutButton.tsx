import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
    >
      Logout
    </button>
  );
}
