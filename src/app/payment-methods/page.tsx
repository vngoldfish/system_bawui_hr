import DashboardLayout from '@/components/layout/DashboardLayout';
import PaymentMethodsClient from '@/components/payment-methods/PaymentMethodsClient';

const employees = [
  { id: '1', firstName: '太郎', lastName: '山田', firstNameKana: 'タロウ', lastNameKana: 'ヤマダ', department: '営業部', position: '部長', salary: 450000, salaryType: '月給' },
  { id: '2', firstName: '花子', lastName: '佐藤', firstNameKana: 'ハナコ', lastNameKana: 'サトウ', department: '開発部', position: '主任', salary: 380000, salaryType: '月給' },
  { id: '3', firstName: '一郎', lastName: '鈴木', firstNameKana: 'イチロウ', lastNameKana: 'スズキ', department: '営業部', position: '係長', salary: 350000, salaryType: '月給' },
  { id: '4', firstName: '美咲', lastName: '田中', firstNameKana: 'ミサキ', lastNameKana: 'タナカ', department: '人事部', position: '課長', salary: 400000, salaryType: '月給' },
  { id: '5', firstName: '健二', lastName: '高橋', firstNameKana: 'ケンジ', lastNameKana: 'タカハシ', department: '開発部', position: '一般', salary: 300000, salaryType: '月給' },
  { id: '6', firstName: '由美', lastName: '渡辺', firstNameKana: 'ユミ', lastNameKana: 'ワタナベ', department: '経理部', position: '主任', salary: 360000, salaryType: '月給' },
  { id: '7', firstName: '大輔', lastName: '伊藤', firstNameKana: 'ダイスケ', lastNameKana: 'イトウ', department: '開発部', position: '一般', salary: 280000, salaryType: '月給' },
  { id: '8', firstName: 'さくら', lastName: '山本', firstNameKana: 'サクラ', lastNameKana: 'ヤマモト', department: '営業部', position: '一般', salary: 270000, salaryType: '月給' },
  { id: '9', firstName: '隆', lastName: '中村', firstNameKana: 'タカシ', lastNameKana: 'ナカムラ', department: '開発部', position: '部長', salary: 500000, salaryType: '月給' },
  { id: '10', firstName: '愛', lastName: '小林', firstNameKana: 'アイ', lastNameKana: 'コバヤシ', department: '人事部', position: '一般', salary: 260000, salaryType: '月給' },
  { id: '11', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', lastNameKana: 'グエン', department: '開発部', position: '一般', salary: 320000, salaryType: '月給' },
  { id: '12', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', lastNameKana: 'リー', department: '営業部', position: '一般', salary: 290000, salaryType: '月給' },
  { id: '13', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', lastNameKana: 'シャルマ', department: '開発部', position: '主任', salary: 420000, salaryType: '月給' },
  { id: '14', firstName: '恵子', lastName: '加藤', firstNameKana: 'ケイコ', lastNameKana: 'カトウ', department: '経理部', position: '課長', salary: 410000, salaryType: '月給' },
];

export default function PaymentMethodsPage() {
  return (
    <DashboardLayout title="支給方法管理" subtitle="給与の支給方法・銀行振込・現金支給の管理">
      <div className="space-y-6">
        <PaymentMethodsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}
