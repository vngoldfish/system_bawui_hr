import DashboardLayout from '@/components/layout/DashboardLayout';
import BenefitsClient from '@/components/benefits/BenefitsClient';

const employees = [
  { id: '1', firstName: '太郎', lastName: '山田', firstNameKana: 'タロウ', department: '営業部', position: '部長', salary: 450000, salaryType: '月給', age: 40 },
  { id: '2', firstName: '花子', lastName: '佐藤', firstNameKana: 'ハナコ', department: '開発部', position: '主任', salary: 380000, salaryType: '月給', age: 35 },
  { id: '3', firstName: '一郎', lastName: '鈴木', firstNameKana: 'イチロウ', department: '営業部', position: '係長', salary: 350000, salaryType: '月給', age: 37 },
  { id: '4', firstName: '美咲', lastName: '田中', firstNameKana: 'ミサキ', department: '人事部', position: '課長', salary: 400000, salaryType: '月給', age: 38 },
  { id: '5', firstName: '健二', lastName: '高橋', firstNameKana: 'ケンジ', department: '開発部', position: '一般', salary: 300000, salaryType: '月給', age: 30 },
  { id: '6', firstName: '由美', lastName: '渡辺', firstNameKana: 'ユミ', department: '経理部', position: '主任', salary: 360000, salaryType: '月給', age: 34 },
  { id: '7', firstName: '大輔', lastName: '伊藤', firstNameKana: 'ダイスケ', department: '開発部', position: '一般', salary: 280000, salaryType: '月給', age: 29 },
  { id: '8', firstName: 'さくら', lastName: '山本', firstNameKana: 'サクラ', department: '営業部', position: '一般', salary: 270000, salaryType: '月給', age: 27 },
  { id: '9', firstName: '隆', lastName: '中村', firstNameKana: 'タカシ', department: '開発部', position: '部長', salary: 500000, salaryType: '月給', age: 43 },
  { id: '10', firstName: '愛', lastName: '小林', firstNameKana: 'アイ', department: '人事部', position: '一般', salary: 260000, salaryType: '月給', age: 25 },
  { id: '11', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', department: '開発部', position: '一般', salary: 320000, salaryType: '月給', age: 31 },
  { id: '12', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', department: '営業部', position: '一般', salary: 290000, salaryType: '月給', age: 32 },
  { id: '13', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', department: '開発部', position: '主任', salary: 420000, salaryType: '月給', age: 36 },
  { id: '14', firstName: '恵子', lastName: '加藤', firstNameKana: 'ケイコ', department: '経理部', position: '課長', salary: 410000, salaryType: '月給', age: 39 },
];

export default function BenefitsPage() {
  return (
    <DashboardLayout title="福利厚生" subtitle="社会保険・手当・福利厚生の管理">
      <div className="space-y-6">
        <BenefitsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}
