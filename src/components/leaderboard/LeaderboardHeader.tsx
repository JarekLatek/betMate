export function LeaderboardHeader() {
  return (
    <thead className="bg-muted/50 sticky top-0">
      <tr>
        <th scope="col" className="w-16 px-4 py-3 text-left text-sm font-semibold">
          #
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">
          Użytkownik
        </th>
        <th scope="col" className="w-24 px-4 py-3 text-right text-sm font-semibold">
          Punkty
        </th>
      </tr>
    </thead>
  );
}
