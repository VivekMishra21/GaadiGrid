from app.models.expense import ExpenseCategory


def summarize(category_sums: dict[str, float]) -> dict:
    """Pure shaping of an already-aggregated `{category: sum}` dict (from a SQL
    `GROUP BY`, not a Python loop over every expense row — see
    `expense_repository.sum_by_category_for_vehicle`) — no DB access itself, so it's
    trivially unit-testable. Every category key is always present (0.0 if unused) so
    the client never has to special-case a missing key."""
    by_category = dict.fromkeys(ExpenseCategory.ALL, 0.0)
    for category, total in category_sums.items():
        by_category[category] = round(total, 2)

    return {"total": round(sum(by_category.values()), 2), "by_category": by_category}
