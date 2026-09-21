const FeePayment = require('../models/FeePayment');
const FeeRecord = require('../models/FeeRecord');
const ModuleRecord = require('../models/ModuleRecord');
const JournalEntry = require('../models/JournalEntry');
const Teacher = require('../models/Teacher');

const parseMoney = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// GET /api/finance/:schoolId/summary
exports.getFinancialSummary = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    const [completedPayments, feeRecords, expenseRows, payrollRows, employeeRows, journal] = await Promise.all([
      FeePayment.find({ schoolId, status: 'Completed' }),
      FeeRecord.find({ schoolId }),
      ModuleRecord.find({ schoolId, module: 'expense-management' }),
      ModuleRecord.find({ schoolId, module: 'payroll' }),
      ModuleRecord.find({ schoolId, module: 'employees' }),
      JournalEntry.find({ schoolId }),
    ]);

    const feeIncome = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const feeBilled = feeRecords.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const feeOutstanding = feeRecords.reduce((sum, f) => sum + Number(f.balance || 0), 0);

    const expenseTotal = expenseRows.reduce((sum, row) => {
      const d = row.data || {};
      return sum + parseMoney(d.amount || d.expense || d.total || d.value);
    }, 0);

    const payrollTotal = payrollRows.reduce((sum, row) => {
      const d = row.data || {};
      return sum + parseMoney(d.net || d.salary || d.gross || d.amount);
    }, 0);

    // Manual P&L style rows if any stored under profit-loss module
    const pnlRows = await ModuleRecord.find({ schoolId, module: 'profit-loss' });
    const manualIncome = pnlRows.reduce((s, r) => s + parseMoney(r.data?.income), 0);
    const manualExpense = pnlRows.reduce((s, r) => s + parseMoney(r.data?.expense), 0);

    const totalIncome = feeIncome + manualIncome;
    const totalExpenses = expenseTotal + payrollTotal + manualExpense;
    const netPosition = totalIncome - totalExpenses;

    // Account balances from journal lines + synthetic fee/expense if journal empty
    const accounts = {};
    const bump = (name, debit, credit) => {
      if (!accounts[name]) accounts[name] = { account: name, debit: 0, credit: 0 };
      accounts[name].debit += Number(debit) || 0;
      accounts[name].credit += Number(credit) || 0;
    };

    if (journal.length) {
      for (const entry of journal) {
        for (const line of entry.lines || []) {
          bump(line.account, line.debit, line.credit);
        }
      }
    } else {
      if (feeIncome > 0) {
        bump('Cash and Bank', feeIncome, 0);
        bump('Tuition Income', 0, feeIncome);
      }
      if (expenseTotal > 0) {
        bump('Operating Expenses', expenseTotal, 0);
        bump('Cash and Bank', 0, expenseTotal);
      }
      if (payrollTotal > 0) {
        bump('Salaries Expense', payrollTotal, 0);
        bump('Cash and Bank', 0, payrollTotal);
      }
    }

    const trialBalance = Object.values(accounts).map((a) => ({
      account: a.account,
      debit: a.debit,
      credit: a.credit,
      balance: a.debit - a.credit,
    }));

    const totalDebit = trialBalance.reduce((s, a) => s + a.debit, 0);
    const totalCredit = trialBalance.reduce((s, a) => s + a.credit, 0);

    let teacherCount = 0;
    try {
      teacherCount = await Teacher.countDocuments({ schoolId });
    } catch (_) {}

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        netPosition,
        feeIncome,
        feeBilled,
        feeOutstanding,
        expenseTotal,
        payrollTotal,
        manualIncome,
        manualExpense,
        completedPaymentCount: completedPayments.length,
        expenseCount: expenseRows.length,
        payrollCount: payrollRows.length,
        employeeCount: employeeRows.length || teacherCount,
        teacherCount,
      },
      trialBalance,
      totals: { debit: totalDebit, credit: totalCredit },
      recentPayments: completedPayments
        .sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
        .slice(0, 8)
        .map((p) => ({
          id: p._id,
          amount: p.amount,
          method: p.method,
          receiptNumber: p.receiptNumber,
          paidAt: p.paidAt || p.createdAt,
          status: p.status,
        })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
