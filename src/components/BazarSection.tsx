import React, { useState, useEffect } from 'react';
import { useMembers } from '../context/MemberContext';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import RetroWindow from './ui/RetroWindow';
import RetroInput from './ui/RetroInput';
import RetroButton from './ui/RetroButton';
import { ShoppingCartIcon, TrashIcon, LoaderIcon, EditIcon, SaveIcon, XIcon } from 'lucide-react';
import { saveSelectedMemberId, getValidSelectedMemberId } from '../utils/memberPersistence';
const BazarSection = () => {
  const {
    members
  } = useMembers();
  const {
    expenses,
    addExpense,
    removeExpense,
    updateExpense,
    loading,
    error,
    canEditExpense,
    canDeleteExpense
  } = useExpenses();
  const { isAuthenticated, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    memberId: '',
    itemName: '',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingExpenses, setDeletingExpenses] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    memberId: string;
    itemName: string;
    quantity: string;
    price: string;
    date: string;
  } | null>(null);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);

  // Initialize form with stored member ID when members are loaded
  useEffect(() => {
    if (members.length > 0 && !formData.memberId) {
      const storedMemberId = getValidSelectedMemberId(members);
      if (storedMemberId) {
        setFormData(prev => ({
          ...prev,
          memberId: storedMemberId
        }));
      }
    }
  }, [members, formData.memberId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const {
      name,
      value
    } = e.target;

    // Save member selection to local storage for persistence
    if (name === 'memberId' && value) {
      saveSelectedMemberId(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId || !formData.itemName || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        memberId: formData.memberId,
        itemName: formData.itemName,
        quantity: formData.quantity,
        price: parseFloat(formData.price),
        date: formData.date
      });

      // Reset form on success, but preserve member selection for convenience
      const currentMemberId = formData.memberId;
      setFormData({
        memberId: currentMemberId, // Keep the selected member for next entry
        itemName: '',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveExpense = async (id: string) => {
    if (!canDeleteExpense) {
      alert('Access denied. Only administrators can delete expense records.');
      return;
    }

    if (!confirm('Are you sure you want to delete this expense record?')) {
      return;
    }

    setDeletingExpenses(prev => new Set(prev).add(id));
    try {
      await removeExpense(id);
    } catch (error) {
      console.error('Failed to remove expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove expense. Please try again.');
    } finally {
      setDeletingExpenses(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleStartEdit = (expense: any) => {
    if (!canEditExpense) {
      alert('Access denied. Only administrators can edit expense records.');
      return;
    }

    setEditingExpense({
      id: expense.id,
      memberId: expense.memberId,
      itemName: expense.itemName,
      quantity: expense.quantity,
      price: expense.price.toString(),
      date: expense.date
    });
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingExpense) {
      setEditingExpense({
        ...editingExpense,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    if (!editingExpense.memberId || !editingExpense.itemName || !editingExpense.price) {
      alert('Please fill in all required fields');
      return;
    }

    setIsUpdatingExpense(true);
    try {
      await updateExpense(editingExpense.id, {
        memberId: editingExpense.memberId,
        itemName: editingExpense.itemName,
        quantity: editingExpense.quantity,
        price: parseFloat(editingExpense.price),
        date: editingExpense.date
      });
      setEditingExpense(null);
    } catch (error) {
      console.error('Failed to update expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to update expense. Please try again.');
    } finally {
      setIsUpdatingExpense(false);
    }
  };
  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return <div className="w-full">
        <RetroWindow title="BAZAR EXPENSE TRACKER" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="animate-spin mr-2" />
            <span className="text-lg">Loading expenses...</span>
          </div>
        </RetroWindow>
      </div>;
  }

  // Don't show connection errors if user is not authenticated
  if (!isAuthenticated) {
    return <div className="w-full">
        <RetroWindow title="BAZAR EXPENSE TRACKER" className="mb-8">
          <div className="flex items-center justify-center py-8">
            <span className="text-lg">Please sign in to access expense tracking.</span>
          </div>
        </RetroWindow>
      </div>;
  }

  return <div className="w-full">
      <RetroWindow title="BAZAR EXPENSE TRACKER" className="mb-8">
        {error && <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 mb-4">
            <strong>Error:</strong> {error}
          </div>}

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Add New Expense</h2>
          <form onSubmit={handleSubmit} className="border-4 border-black p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1">Member</label>
                <select name="memberId" value={formData.memberId} onChange={handleChange} required className="w-full p-2 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-gray-400 mb-4">
                  <option value="">Select Member</option>
                  {members.map(member => <option key={member.id} value={member.id}>
                      {member.name}
                    </option>)}
                </select>
              </div>
              <RetroInput label="Date" type="date" value={formData.date} onChange={handleChange} required name="date" />
              <RetroInput label="Item Name" value={formData.itemName} onChange={handleChange} required placeholder="e.g., Rice, Vegetables" name="itemName" />
              <RetroInput label="Quantity" value={formData.quantity} onChange={handleChange} placeholder="e.g., 2kg, 5 pieces" name="quantity" />
              <RetroInput label="Price (৳)" type="number" value={formData.price} onChange={handleChange} required placeholder="0.00" name="price" />
            </div>
            <div className="mt-4">
              <RetroButton
                type="submit"
                className="flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    ADDING...
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="w-4 h-4 mr-2" />
                    ADD EXPENSE
                  </>
                )}
              </RetroButton>
            </div>
          </form>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Expense Records</h2>
          <div className="border-4 border-black overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-gray-600 p-2 text-left">Date</th>
                  <th className="border border-gray-600 p-2 text-left">
                    Member
                  </th>
                  <th className="border border-gray-600 p-2 text-left">Item</th>
                  <th className="border border-gray-600 p-2 text-left">
                    Quantity
                  </th>
                  <th className="border border-gray-600 p-2 text-left">
                    Price (৳)
                  </th>
                  <th className="border border-gray-600 p-2 text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedExpenses.length > 0 ? sortedExpenses.map(expense => {
                const member = members.find(m => m.id === expense.memberId);
                const isEditing = editingExpense && editingExpense.id === expense.id;

                return <tr key={expense.id} className="border-b border-black hover:bg-gray-100">
                        {isEditing ? (
                          // Edit mode
                          <>
                            <td className="border-r border-black p-2">
                              <input
                                type="date"
                                name="date"
                                value={editingExpense.date}
                                onChange={handleEditChange}
                                className="w-full p-1 border border-gray-300 text-xs"
                              />
                            </td>
                            <td className="border-r border-black p-2">
                              <select
                                name="memberId"
                                value={editingExpense.memberId}
                                onChange={handleEditChange}
                                className="w-full p-1 border border-gray-300 text-xs"
                              >
                                {members.map(member => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border-r border-black p-2">
                              <input
                                type="text"
                                name="itemName"
                                value={editingExpense.itemName}
                                onChange={handleEditChange}
                                className="w-full p-1 border border-gray-300 text-xs"
                              />
                            </td>
                            <td className="border-r border-black p-2">
                              <input
                                type="text"
                                name="quantity"
                                value={editingExpense.quantity}
                                onChange={handleEditChange}
                                className="w-full p-1 border border-gray-300 text-xs"
                              />
                            </td>
                            <td className="border-r border-black p-2">
                              <input
                                type="number"
                                name="price"
                                value={editingExpense.price}
                                onChange={handleEditChange}
                                step="0.01"
                                className="w-full p-1 border border-gray-300 text-xs"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex justify-center space-x-1">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isUpdatingExpense}
                                  className="text-green-600 hover:text-green-800 disabled:text-gray-400"
                                  title="Save changes"
                                >
                                  {isUpdatingExpense ? (
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <SaveIcon className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={isUpdatingExpense}
                                  className="text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                                  title="Cancel edit"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="border-r border-black p-2">
                              {new Date(expense.date).toLocaleDateString()}
                            </td>
                            <td className="border-r border-black p-2">
                              {member ? member.name : 'Unknown'}
                            </td>
                            <td className="border-r border-black p-2">
                              {expense.itemName}
                            </td>
                            <td className="border-r border-black p-2">
                              {expense.quantity}
                            </td>
                            <td className="border-r border-black p-2">
                              ৳{expense.price.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex justify-center space-x-1">
                                {canEditExpense && (
                                  <button
                                    onClick={() => handleStartEdit(expense)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit expense"
                                  >
                                    <EditIcon className="w-4 h-4" />
                                  </button>
                                )}
                                {canDeleteExpense && (
                                  <button
                                    onClick={() => handleRemoveExpense(expense.id)}
                                    disabled={deletingExpenses.has(expense.id)}
                                    className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                                    title="Delete expense"
                                  >
                                    {deletingExpenses.has(expense.id) ? (
                                      <LoaderIcon className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <TrashIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                {!canEditExpense && !canDeleteExpense && (
                                  <span className="text-gray-400 text-xs">View Only</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>;
              }) : <tr>
                    <td colSpan={6} className="p-4 text-center">
                      No expenses recorded yet.
                    </td>
                  </tr>}
              </tbody>
            </table>
          </div>
        </div>
      </RetroWindow>
    </div>;
};
export default BazarSection;