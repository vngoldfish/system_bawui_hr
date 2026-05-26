import DashboardLayout from '@/components/layout/DashboardLayout';
import ExpensesClient from '@/components/expenses/ExpensesClient';

const employees = [
  { id: '1', firstName: '太郎', lastName: '山田', firstNameKana: 'タロウ', department: '営業部', position: '部長' },
  { id: '2', firstName: '花子', lastName: '佐藤', firstNameKana: 'ハナコ', department: '開発部', position: '主任' },
  { id: '3', firstName: '一郎', lastName: '鈴木', firstNameKana: 'イチロウ', department: '営業部', position: '係長' },
  { id: '4', firstName: '美咲', lastName: '田中', firstNameKana: 'ミサキ', department: '人事部', position: '課長' },
  { id: '5', firstName: '健二', lastName: '高橋', firstNameKana: 'ケンジ', department: '開発部', position: '一般' },
  { id: '6', firstName: '由美', lastName: '渡辺', firstNameKana: 'ユミ', department: '経理部', position: '主任' },
  { id: '7', firstName: '大輔', lastName: '伊藤', firstNameKana: 'ダイスケ', department: '開発部', position: '一般' },
  { id: '8', firstName: 'さくら', lastName: '山本', firstNameKana: 'サクラ', department: '営業部', position: '一般' },
  { id: '9', firstName: '隆', lastName: '中村', firstNameKana: 'タカシ', department: '開発部', position: '部長' },
  { id: '10', firstName: '愛', lastName: '小林', firstNameKana: 'アイ', department: '人事部', position: '一般' },
  { id: '11', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', department: '開発部', position: '一般' },
  { id: '12', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', department: '営業部', position: '一般' },
  { id: '13', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', department: '開発部', position: '主任' },
  { id: '14', firstName: '恵子', lastName: '加藤', firstNameKana: 'ケイコ', department: '経理部', position: '課長' },
];

export default function ExpensesPage() {
  return (
    <DashboardLayout title="経費管理" subtitle="経費申請・承認・集計">
      <div className="space-y-6">
        <ExpensesClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}
