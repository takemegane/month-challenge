export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-orange-900">ページが見つかりません</h1>
      <p className="text-orange-900/80">お探しのページは存在しないか、移動しました。</p>
      <a href="/" className="text-orange-700 underline">トップへ戻る</a>
    </div>
  );
}

