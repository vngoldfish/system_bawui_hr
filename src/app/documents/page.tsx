import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentsClient from '@/components/documents/DocumentsClient';

const employees = [
  { id: '1', firstName: '太郎', lastName: '山田', firstNameKana: 'タロウ', department: '営業部', position: '部長', salary: 450000, salaryType: '月給', joinDate: '2018-04-01', birthDate: '1985-03-15', address: '東京都新宿区' },
  { id: '2', firstName: '花子', lastName: '佐藤', firstNameKana: 'ハナコ', department: '開発部', position: '主任', salary: 380000, salaryType: '月給', joinDate: '2019-07-01', birthDate: '1990-06-20', address: '東京都渋谷区' },
  { id: '3', firstName: '一郎', lastName: '鈴木', firstNameKana: 'イチロウ', department: '営業部', position: '係長', salary: 350000, salaryType: '月給', joinDate: '2020-01-15', birthDate: '1988-11-05', address: '東京都世田谷区' },
  { id: '4', firstName: '美咲', lastName: '田中', firstNameKana: 'ミサキ', department: '人事部', position: '課長', salary: 400000, salaryType: '月給', joinDate: '2017-04-01', birthDate: '1987-09-12', address: '東京都品川区' },
  { id: '5', firstName: '健二', lastName: '高橋', firstNameKana: 'ケンジ', department: '開発部', position: '一般', salary: 300000, salaryType: '月給', joinDate: '2022-04-01', birthDate: '1995-02-28', address: '東京都中野区' },
  { id: '6', firstName: '由美', lastName: '渡辺', firstNameKana: 'ユミ', department: '経理部', position: '主任', salary: 360000, salaryType: '月給', joinDate: '2019-10-01', birthDate: '1991-07-08', address: '東京都杉並区' },
  { id: '7', firstName: '大輔', lastName: '伊藤', firstNameKana: 'ダイスケ', department: '開発部', position: '一般', salary: 280000, salaryType: '月給', joinDate: '2023-01-10', birthDate: '1996-12-03', address: '東京都板橋区' },
  { id: '8', firstName: 'さくら', lastName: '山本', firstNameKana: 'サクラ', department: '営業部', position: '一般', salary: 270000, salaryType: '月給', joinDate: '2023-04-01', birthDate: '1998-04-15', address: '東京都豊島区' },
  { id: '9', firstName: '隆', lastName: '中村', firstNameKana: 'タカシ', department: '開発部', position: '部長', salary: 500000, salaryType: '月給', joinDate: '2015-04-01', birthDate: '1982-01-20', address: '東京都目黒区' },
  { id: '10', firstName: '愛', lastName: '小林', firstNameKana: 'アイ', department: '人事部', position: '一般', salary: 260000, salaryType: '月給', joinDate: '2024-04-01', birthDate: '2000-08-10', address: '東京都葛飾区' },
  { id: '11', firstName: 'ミン', lastName: 'グエン', firstNameKana: 'ミン', department: '開発部', position: '一般', salary: 320000, salaryType: '月給', joinDate: '2022-07-01', birthDate: '1994-05-22', address: '東京都江戸川区' },
  { id: '12', firstName: 'ウェイ', lastName: 'リー', firstNameKana: 'ウェイ', department: '営業部', position: '一般', salary: 290000, salaryType: '月給', joinDate: '2023-03-01', birthDate: '1993-10-18', address: '東京都台東区' },
  { id: '13', firstName: 'ラビ', lastName: 'シャルマ', firstNameKana: 'ラビ', department: '開発部', position: '主任', salary: 420000, salaryType: '月給', joinDate: '2021-01-15', birthDate: '1989-03-30', address: '東京都港区' },
  { id: '14', firstName: '恵子', lastName: '加藤', firstNameKana: 'ケイコ', department: '経理部', position: '課長', salary: 410000, salaryType: '月給', joinDate: '2016-04-01', birthDate: '1986-11-25', address: '東京都文京区' },
];

export default function DocumentsPage() {
  return (
    <DashboardLayout title="書類管理" subtitle="各種証明書・書類の発行管理">
      <div className="space-y-6">
        <DocumentsClient employees={employees} />
      </div>
    </DashboardLayout>
  );
}
