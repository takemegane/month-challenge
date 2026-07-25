import { redirect } from "next/navigation";

// 未ログインは middleware が /auth/sign-in へ振り分けるため、
// ここに到達するのはログイン済みのユーザーだけ。
// 以前はここに静的な案内ページを置いていたので、ログイン済みで開いても
// 「まずは登録/ログインしてください」と表示されてしまっていた。
export default function Home() {
  redirect("/calendar");
}
