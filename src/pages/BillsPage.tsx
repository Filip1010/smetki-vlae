import { useBillsContext } from '../context/BillsContext';
import BillTable from '../components/BillTable/BillTable';

export default function BillsPage() {
  const { bills, addBill, updateBill, deleteBill, toggleStatus } = useBillsContext();

  return (
    <BillTable
      bills={bills}
      onAdd={addBill}
      onUpdate={updateBill}
      onDelete={deleteBill}
      onToggleStatus={toggleStatus}
    />
  );
}
