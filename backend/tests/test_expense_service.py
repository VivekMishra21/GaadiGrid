from app.models.expense import ExpenseCategory
from app.services.expense_service import summarize


def test_summarize_empty_dict():
    result = summarize({})
    assert result["total"] == 0.0
    assert result["by_category"][ExpenseCategory.FUEL] == 0.0
    assert set(result["by_category"].keys()) == set(ExpenseCategory.ALL)


def test_summarize_totals_by_category():
    result = summarize({ExpenseCategory.FUEL: 800.0, ExpenseCategory.SERVICE: 1200.0})
    assert result["by_category"][ExpenseCategory.FUEL] == 800.0
    assert result["by_category"][ExpenseCategory.SERVICE] == 1200.0
    assert result["total"] == 2000.0


def test_summarize_unused_categories_are_zero():
    result = summarize({ExpenseCategory.FINE: 50.0})
    assert result["by_category"][ExpenseCategory.PARKING] == 0.0
