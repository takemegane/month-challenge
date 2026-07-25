import { redirect } from "next/navigation";

// 未ログインは middleware が /auth/sign-in へ振り分けるため、
// ここに到達するのはログイン済みのユーザーだけ。
// 以前はここに静的な案内ページを置いていたので、ログイン済みで開いても
// 「まずは登録/ログインしてください」と表示されてしまっていた。
// redirect() の戻り値は never。注釈を省くと推論が void になり、
// ページの型チェックで弾かれる可能性があるため明示する。
export default function Home(): never {
  redirect("/calendar");
}
