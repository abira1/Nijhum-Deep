import React, { useState } from 'react';
import { useMembers } from '../context/MemberContext';
import { useMeals } from '../context/MealContext';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import RetroWindow from './ui/RetroWindow';
import RetroButton from './ui/RetroButton';
import { DownloadIcon, PrinterIcon, CalendarIcon, ChevronRightIcon } from 'lucide-react';
const CalculateSection = () => {
  const {
    members
  } = useMembers();
  const {
    getMealCountByMember
  } = useMeals();
  const {
    getTotalExpenseByMember,
    getTotalExpense
  } = useExpenses();
  const { isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({
    length: 5
  }, (_, i) => new Date().getFullYear() - 2 + i);
  const totalMeals = members.reduce((sum, member) => sum + getMealCountByMember(member.id, selectedMonth, selectedYear), 0);
  const totalExpense = getTotalExpense(selectedMonth, selectedYear);
  const mealRate = totalMeals > 0 ? totalExpense / totalMeals : 0;
  const calculateBalance = (memberId: string) => {
    const memberMeals = getMealCountByMember(memberId, selectedMonth, selectedYear);
    const memberExpense = getTotalExpenseByMember(memberId, selectedMonth, selectedYear);
    const mealCost = memberMeals * mealRate;
    return memberExpense - mealCost;
  };
  const handlePrint = () => {
    window.print();
  };
  const handleDownloadPDF = () => {
    alert('PDF download functionality would be implemented here.');
    // In a real implementation, we would use a library like jsPDF to generate a PDF
  };
  // Generate previous months list (last 6 months)
  const getPreviousMonths = () => {
    const result = [];
    const currentDate = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      result.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: `${months[date.getMonth()]} ${date.getFullYear()}`
      });
    }
    return result;
  };
  const previousMonths = getPreviousMonths();
  const selectMonth = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  // Don't show calculations if user is not authenticated
  if (!isAuthenticated) {
    return <div className="w-full">
        <RetroWindow title="MONTHLY CALCULATION" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <span className="text-lg">Please sign in to access monthly calculations.</span>
          </div>
        </RetroWindow>
      </div>;
  }

  return <div className="w-full">
      <RetroWindow title="MONTHLY CALCULATION" className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-2xl font-bold mb-4 md:mb-0">
            {months[selectedMonth]} {selectedYear} Report
          </h2>
          <div className="flex flex-wrap gap-2">
            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border-2 border-black p-2 font-mono">
              {months.map((month, index) => <option key={month} value={index}>
                  {month}
                </option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border-2 border-black p-2 font-mono">
              {years.map(year => <option key={year} value={year}>
                  {year}
                </option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SummaryCard title="TOTAL MEALS" value={totalMeals} />
          <SummaryCard title="TOTAL EXPENSE" value={`৳${totalExpense.toFixed(2)}`} />
          <SummaryCard title="MEAL RATE" value={`৳${mealRate.toFixed(2)}`} />
        </div>
        {/* Desktop view table (hidden on small screens) */}
        <div className="border-4 border-black mb-6 hidden sm:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="border border-gray-600 p-2 text-left">Member</th>
                <th className="border border-gray-600 p-2 text-center">
                  Total Meals
                </th>
                <th className="border border-gray-600 p-2 text-center">
                  Meal Cost
                </th>
                <th className="border border-gray-600 p-2 text-center">
                  Expenses Paid
                </th>
                <th className="border border-gray-600 p-2 text-center">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
              const memberMeals = getMealCountByMember(member.id, selectedMonth, selectedYear);
              const memberExpense = getTotalExpenseByMember(member.id, selectedMonth, selectedYear);
              const mealCost = memberMeals * mealRate;
              const balance = calculateBalance(member.id);
              return <tr key={member.id} className="border-b border-black hover:bg-gray-100">
                    <td className="border-r border-black p-2 font-bold">
                      {member.name}
                    </td>
                    <td className="border-r border-black p-2 text-center">
                      {memberMeals}
                    </td>
                    <td className="border-r border-black p-2 text-center">
                      ৳{mealCost.toFixed(2)}
                    </td>
                    <td className="border-r border-black p-2 text-center">
                      ৳{memberExpense.toFixed(2)}
                    </td>
                    <td className={`p-2 text-center font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance >= 0 ? `+৳${balance.toFixed(2)}` : `-৳${Math.abs(balance).toFixed(2)}`}
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
        {/* Mobile view cards (shown only on small screens) */}
        <div className="sm:hidden space-y-4 mb-6">
          {members.map(member => {
          const memberMeals = getMealCountByMember(member.id, selectedMonth, selectedYear);
          const memberExpense = getTotalExpenseByMember(member.id, selectedMonth, selectedYear);
          const mealCost = memberMeals * mealRate;
          const balance = calculateBalance(member.id);
          return <div key={member.id} className="border-4 border-black">
                <div className="bg-black text-white p-2 font-bold">
                  {member.name}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="font-bold">Total Meals:</span>
                    <span>{memberMeals}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="font-bold">Meal Cost:</span>
                    <span>৳{mealCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="font-bold">Expenses Paid:</span>
                    <span>৳{memberExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold">Balance:</span>
                    <span className={`font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance >= 0 ? `+৳${balance.toFixed(2)}` : `-৳${Math.abs(balance).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>;
        })}
        </div>
        <div className="flex flex-wrap gap-2">
          <RetroButton onClick={handlePrint} className="flex items-center">
            <PrinterIcon className="w-4 h-4 mr-2" />
            PRINT REPORT
          </RetroButton>
          <RetroButton onClick={handleDownloadPDF} className="flex items-center">
            <DownloadIcon className="w-4 h-4 mr-2" />
            DOWNLOAD PDF
          </RetroButton>
        </div>
      </RetroWindow>
      <RetroWindow title="CALCULATION DETAILS" className="mb-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2">How Calculations Work</h3>
          <div className="border-l-4 border-black pl-4">
            <p className="mb-2">
              <strong>Meal Rate</strong> = Total Expenses ÷ Total Meals
            </p>
            <p className="mb-2">
              <strong>Individual Meal Cost</strong> = Number of Meals × Meal
              Rate
            </p>
            <p className="mb-2">
              <strong>Balance</strong> = Expenses Paid - Individual Meal Cost
            </p>
            <p className="mb-4">
              Positive balance means the member paid more than their meal cost.
              Negative balance means they need to pay the difference.
            </p>
          </div>
        </div>
      </RetroWindow>
      <RetroWindow title="PREVIOUS MONTHS">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {previousMonths.map((item, index) => <div key={index} onClick={() => selectMonth(item.month, item.year)} className={`cursor-pointer border-4 border-black p-3 text-center hover:bg-gray-100 transition-colors ${selectedMonth === item.month && selectedYear === item.year ? 'bg-black text-white' : ''}`}>
              <div className="flex justify-center mb-1">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm">{months[item.month]}</div>
              <div className="text-xs">{item.year}</div>
            </div>)}
        </div>
      </RetroWindow>
    </div>;
};
interface SummaryCardProps {
  title: string;
  value: string | number;
}
const SummaryCard = ({
  title,
  value
}: SummaryCardProps) => {
  return <div className="border-4 border-black p-4 text-center">
      <h3 className="font-bold mb-2">{title}</h3>
      <div className="text-3xl font-bold">{value}</div>
    </div>;
};
export default CalculateSection;