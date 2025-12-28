
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  ChevronRight, 
  Download, 
  ChefHat, 
  Printer,
  CheckCircle2,
  Home,
  Layers,
  Search,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  FileCode,
  Calendar,
  Users,
  Clock,
  Save,
  Archive,
  ArrowLeft
} from 'lucide-react';
import { PlanState, MealTime, MealOption, RecipeDetail, AppMode, IngredientSummary, CustomMealEntry, SavedReport } from './types.ts';
import { generateMenuOptions, calculateIngredientsAndRecipes } from './services/geminiService.ts';

const MEAL_TIMES: MealTime[] = ['아침', '점심', '저녁', '야식'];

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  
  // 데이터 저장 및 복구
  const [plan, setPlan] = useState<PlanState>(() => {
    const saved = localStorage.getItem('nutritionist_plan');
    return saved ? JSON.parse(saved) : {
      eventName: '',
      headCount: 50,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      mealTimes: ['점심', '저녁'],
    };
  });

  const [customEntries, setCustomEntries] = useState<CustomMealEntry[]>(() => {
    const saved = localStorage.getItem('nutritionist_custom');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: new Date().toISOString().split('T')[0], mealTime: '점심', headCount: 50, menuName: '' }
    ];
  });

  const [finalPlan, setFinalPlan] = useState<RecipeDetail[]>([]);

  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => {
    const saved = localStorage.getItem('nutritionist_reports_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [menuOptions, setMenuOptions] = useState<Record<string, Record<MealTime, MealOption[]>>>(() => {
    const saved = localStorage.getItem('nutritionist_options');
    return saved ? JSON.parse(saved) : {};
  });

  const [selections, setSelections] = useState<{ date: string, time: MealTime, menuName: string }[]>([]);
  const [singleMenu, setSingleMenu] = useState('');
  const [singleHeadCount, setSingleHeadCount] = useState(50);

  // 로컬 스토리지 자동 저장
  useEffect(() => { localStorage.setItem('nutritionist_plan', JSON.stringify(plan)); }, [plan]);
  useEffect(() => { localStorage.setItem('nutritionist_custom', JSON.stringify(customEntries)); }, [customEntries]);
  useEffect(() => { localStorage.setItem('nutritionist_options', JSON.stringify(menuOptions)); }, [menuOptions]);
  useEffect(() => { localStorage.setItem('nutritionist_reports_v2', JSON.stringify(savedReports)); }, [savedReports]);

  // 식재료 통합 계산
  const totalIngredients = useMemo(() => {
    const summary: Record<string, IngredientSummary> = {};
    finalPlan.forEach(meal => {
      meal.ingredients.forEach(ing => {
        if (!ing || !ing.name) return;
        const key = `${ing.name}_${ing.unit || ''}`;
        const amountStr = String(ing.amount || '0');
        const numericAmount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
        
        if (!summary[key]) {
          summary[key] = { name: ing.name, totalAmount: 0, unit: ing.unit || '', breakdown: [] };
        }
        summary[key].totalAmount += numericAmount;
        summary[key].breakdown.push({ 
          date: meal.date, 
          mealTime: meal.mealTime, 
          amount: amountStr, 
          menuName: meal.menuName 
        });
      });
    });
    return Object.values(summary);
  }, [finalPlan]);

  const exportToCSV = () => {
    if (totalIngredients.length === 0) return;
    const headers = ["품목명", "총 소요량", "단위", "상세내역"];
    const rows = totalIngredients.map(item => [
      item.name, 
      item.totalAmount.toString(), 
      item.unit,
      item.breakdown.map(b => `${b.date}(${b.mealTime}) ${b.menuName}:${b.amount}`).join(' | ')
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `식재료산출_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleSaveToArchive = () => {
    if (finalPlan.length === 0) return;
    
    let title = "";
    if (mode === 'eventPlan') title = plan.eventName || "행사 식단 리포트";
    else if (mode === 'singleRecipe') title = singleMenu || "메뉴 조회 리포트";
    else if (mode === 'customPlan') title = "직접 입력 식단 리포트";
    else title = "산출 리포트";

    const newReport: SavedReport = {
      id: Math.random().toString(36).substr(2, 9),
      title: `${title} (${new Date().toLocaleDateString()})`,
      createdAt: new Date().toISOString(),
      data: finalPlan
    };

    setSavedReports([newReport, ...savedReports]);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  const deleteSavedReport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('이 리포트를 삭제하시겠습니까?')) {
      const newReports = savedReports.filter(r => r.id !== id);
      setSavedReports(newReports);
      // 만약 현재 보고 있는 리포트가 삭제된 것이라면 홈으로 이동
      if (mode === 'savedReports' && step === 2) {
        resetToHome();
      }
    }
  };

  const loadSavedReport = (report: SavedReport) => {
    setFinalPlan(report.data);
    setMode('savedReports');
    setStep(2);
  };

  const saveAsHTML = () => {
    const reportElement = document.querySelector('#report-content')?.innerHTML;
    if (!reportElement) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>오쉡의 요리 솔루션 보고서</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b; }
          .report-container { max-width: 1000px; margin: 0 auto; background: white; padding: 50px; border-radius: 30px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #e2e8f0; padding: 15px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: 700; color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
          .no-print { display: none !important; }
          @media print {
            @page { size: A4; margin: 15mm; }
            body { padding: 0; background: white; }
            .report-container { box-shadow: none; width: 100%; max-width: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${reportElement}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `오쉡_요리솔루션_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetToHome = () => {
    setMode('dashboard');
    setStep(1);
    setFinalPlan([]);
  };

  const handleStartPlanning = async () => {
    if (!plan.eventName.trim()) return alert('행사 명칭을 입력해주세요.');
    setLoading(true);
    try {
      const options = await generateMenuOptions(plan);
      setMenuOptions(options);
      setStep(2);
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const handleCalculateEvent = async () => {
    if (selections.length === 0) return alert('메뉴를 선택해주세요.');
    setLoading(true);
    try {
      const req = selections.map(s => ({ date: s.date, mealTime: s.time, menuName: s.menuName, headCount: plan.headCount }));
      const results = await calculateIngredientsAndRecipes(req);
      setFinalPlan(results);
      setStep(3);
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const handleSingleSearch = async () => {
    if (!singleMenu.trim()) return alert('메뉴명을 입력해주세요.');
    setLoading(true);
    try {
      const results = await calculateIngredientsAndRecipes([{ menuName: singleMenu, headCount: singleHeadCount }]);
      setFinalPlan(results);
      setStep(2);
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const handleCustomSearch = async () => {
    const validEntries = customEntries.filter(e => e.menuName.trim() !== '');
    if (validEntries.length === 0) return alert('메뉴명을 입력해주세요.');
    setLoading(true);
    try {
      const req = validEntries.map(e => ({ date: e.date, mealTime: e.mealTime, menuName: e.menuName, headCount: e.headCount }));
      const results = await calculateIngredientsAndRecipes(req);
      setFinalPlan([...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setStep(2);
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  };

  const addCustomRow = () => {
    const last = customEntries[customEntries.length - 1];
    setCustomEntries([...customEntries, { id: Math.random().toString(36).substr(2, 9), date: last.date, mealTime: '점심', headCount: last.headCount, menuName: '' }]);
  };

  const updateCustomRow = (id: string, field: keyof CustomMealEntry, value: any) => {
    setCustomEntries(customEntries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleSelection = (date: string, time: MealTime, menuName: string) => {
    const existingIdx = selections.findIndex(s => s.date === date && s.time === time);
    if (existingIdx > -1) {
      const newSelections = [...selections];
      newSelections[existingIdx] = { date, time, menuName };
      setSelections(newSelections);
    } else {
      setSelections([...selections, { date, time, menuName }]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={resetToHome}>
            <ChefHat className="w-8 h-8 text-amber-500 transition-transform group-hover:rotate-12" />
            <h1 className="text-xl font-bold tracking-tight">오쉡의 <span className="text-amber-500 font-black">요리 솔루션</span></h1>
          </div>
          <button onClick={resetToHome} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold">
            <Home className="w-5 h-5" /> <span className="hidden sm:inline">대시보드</span>
          </button>
        </div>
      </header>

      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm no-print">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="text-lg font-bold text-amber-500 tracking-wider">데이터 정밀 분석 및 식재료 산출 중...</p>
          <p className="text-slate-400 mt-2 animate-pulse text-sm">잠시만 기다려 주세요 (약 5~10초)</p>
        </div>
      )}

      <main className="max-w-6xl mx-auto mt-12 px-6 pb-24">
        {mode === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight italic">오쉡의 요리 솔루션</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div onClick={() => { setMode('eventPlan'); setStep(1); }} className="group bg-slate-800/40 border border-slate-700 p-8 rounded-[2rem] cursor-pointer hover:border-amber-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="bg-amber-500/10 p-5 rounded-3xl w-fit mb-6"><Layers className="w-10 h-10 text-amber-500" /></div>
                <h3 className="text-xl font-black text-white mb-2">행사 식단 구성</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">학술회 등 특별 행사에 맞는 메뉴를 제안받습니다.</p>
                <div className="flex items-center text-amber-500 text-sm font-bold group-hover:translate-x-2 transition-transform">시작하기 <ArrowRight className="w-4 h-4 ml-2" /></div>
              </div>
              <div onClick={() => { setMode('customPlan'); setStep(1); }} className="group bg-slate-800/40 border border-slate-700 p-8 rounded-[2rem] cursor-pointer hover:border-emerald-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="bg-emerald-500/10 p-5 rounded-3xl w-fit mb-6"><Edit3 className="w-10 h-10 text-emerald-500" /></div>
                <h3 className="text-xl font-black text-white mb-2">직접 입력 식단</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">식단 리스트를 입력하여 식재료 합계를 뽑습니다.</p>
                <div className="flex items-center text-emerald-500 text-sm font-bold group-hover:translate-x-2 transition-transform">입력하기 <ArrowRight className="w-4 h-4 ml-2" /></div>
              </div>
              <div onClick={() => { setMode('singleRecipe'); setStep(1); }} className="group bg-slate-800/40 border border-slate-700 p-8 rounded-[2rem] cursor-pointer hover:border-blue-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="bg-blue-500/10 p-5 rounded-3xl w-fit mb-6"><Search className="w-10 h-10 text-blue-500" /></div>
                <h3 className="text-xl font-black text-white mb-2">메뉴 즉시 조회</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">단일 메뉴에 대한 인원별 식재료를 확인합니다.</p>
                <div className="flex items-center text-blue-500 text-sm font-bold group-hover:translate-x-2 transition-transform">조회하기 <ArrowRight className="w-4 h-4 ml-2" /></div>
              </div>
              <div onClick={() => { setMode('savedReports'); setStep(1); }} className="group bg-slate-800/40 border border-slate-700 p-8 rounded-[2rem] cursor-pointer hover:border-violet-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                <div className="bg-violet-500/10 p-5 rounded-3xl w-fit mb-6"><Archive className="w-10 h-10 text-violet-500" /></div>
                <h3 className="text-xl font-black text-white mb-2">저장된 리포트</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">과거에 산출하여 저장한 데이터를 조회하고 관리합니다.</p>
                <div className="flex items-center text-violet-500 text-sm font-bold group-hover:translate-x-2 transition-transform">조회하기 <ArrowRight className="w-4 h-4 ml-2" /></div>
              </div>
            </div>
          </div>
        )}

        {/* --- 저장된 리포트 조회 모드 --- */}
        {mode === 'savedReports' && step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center gap-4">
              <button onClick={resetToHome} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all"><ArrowLeft size={24}/></button>
              <h2 className="text-3xl font-black text-white">저장된 리포트 관리</h2>
            </div>
            
            {savedReports.length === 0 ? (
              <div className="bg-slate-800/20 border-2 border-dashed border-slate-700 rounded-[2.5rem] p-20 text-center space-y-4">
                <Archive className="mx-auto w-16 h-16 text-slate-600 mb-4" />
                <p className="text-xl font-bold text-slate-500">저장된 리포트가 없습니다.</p>
                <p className="text-slate-600">식단을 산출한 후 '리포트 저장' 버튼을 클릭해 보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedReports.map(report => (
                  <div key={report.id} onClick={() => loadSavedReport(report)} className="group bg-slate-800/40 border border-slate-700 p-8 rounded-[2rem] cursor-pointer hover:border-violet-500 transition-all hover:shadow-2xl flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 text-xs font-black uppercase tracking-widest">
                        <Calendar size={14} /> {new Date(report.createdAt).toLocaleDateString()}
                      </div>
                      <h3 className="text-xl font-black text-white">{report.title}</h3>
                      <p className="text-slate-500 text-sm">{report.data.length}개의 메뉴 산출됨</p>
                    </div>
                    <button onClick={(e) => deleteSavedReport(e, report.id)} className="p-4 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all">
                      <Trash2 size={24} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 설정 및 입력 화면들 (Step 1) --- */}
        {mode === 'eventPlan' && step === 1 && (
          <div className="max-w-2xl mx-auto bg-slate-800/40 border border-slate-700 p-10 rounded-[2.5rem] space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-white">행사 기본 정보 설정</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">행사 명칭</label>
                <input type="text" placeholder="예: 학술 세미나" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-amber-500" value={plan.eventName} onChange={e => setPlan({...plan, eventName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">시작 날짜</label>
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-amber-500" value={plan.startDate} onChange={e => setPlan({...plan, startDate: e.target.value})} style={{colorScheme:'dark'}} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">종료 날짜</label>
                  <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-amber-500" value={plan.endDate} onChange={e => setPlan({...plan, endDate: e.target.value})} style={{colorScheme:'dark'}} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">예상 인원(명)</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-amber-500" value={plan.headCount} onChange={e => setPlan({...plan, headCount: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-400">식사 시간 선택</label>
                  <div className="flex gap-2">
                    {['아침','점심','저녁'].map(t => (
                      <button key={t} onClick={() => {
                        const next = plan.mealTimes.includes(t as MealTime) ? plan.mealTimes.filter(x => x !== t) : [...plan.mealTimes, t as MealTime];
                        setPlan({...plan, mealTimes: next});
                      }} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${plan.mealTimes.includes(t as MealTime) ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleStartPlanning} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all">메뉴 추천 생성 <ChevronRight /></button>
          </div>
        )}

        {mode === 'customPlan' && step === 1 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-white">직접 입력 식단</h2>
                <p className="text-slate-500">이미 확정된 식단 리스트를 입력하세요.</p>
              </div>
              <button onClick={addCustomRow} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-5 py-3 rounded-2xl font-bold hover:bg-emerald-600 hover:text-white transition-all"><Plus size={18}/> 행 추가</button>
            </div>
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-[160px,120px,1fr,120px,60px] gap-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <span>날짜</span><span>식사구분</span><span>메뉴명</span><span>인원수(명)</span><span>삭제</span>
              </div>
              {customEntries.map(entry => (
                <div key={entry.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-[160px,120px,1fr,120px,60px] gap-4 items-center">
                  <input type="date" className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={entry.date} onChange={e=>updateCustomRow(entry.id, 'date', e.target.value)} style={{colorScheme:'dark'}}/>
                  <select className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer" value={entry.mealTime} onChange={e=>updateCustomRow(entry.id, 'mealTime', e.target.value)}>
                    {MEAL_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" placeholder="예: 소불고기..." className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={entry.menuName} onChange={e=>updateCustomRow(entry.id, 'menuName', e.target.value)} />
                  <input type="number" className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none" value={entry.headCount} onChange={e=>updateCustomRow(entry.id, 'headCount', Number(e.target.value))} />
                  <button onClick={() => setCustomEntries(customEntries.filter(x=>x.id!==entry.id))} className="text-slate-500 hover:text-red-400 p-2 mx-auto"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
            <button onClick={handleCustomSearch} className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/20 transition-all">전체 식재료 산출 <ChevronRight /></button>
          </div>
        )}

        {mode === 'singleRecipe' && step === 1 && (
          <div className="max-w-xl mx-auto bg-slate-800/40 border border-slate-700 p-10 rounded-[2.5rem] space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-white">단일 메뉴 조회</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">메뉴명</label>
                <input type="text" placeholder="예: 제육볶음" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500" value={singleMenu} onChange={e => setSingleMenu(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">인원수(명)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500" value={singleHeadCount} onChange={e => setSingleHeadCount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <button onClick={handleSingleSearch} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all">산출하기 <Search size={24} /></button>
          </div>
        )}

        {/* --- 행사 식단 메뉴 선택 (Step 2) --- */}
        {mode === 'eventPlan' && step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white">추천 메뉴 선택</h2>
              <p className="text-slate-400">날짜별로 원하는 메뉴 조합을 선택해 주세요.</p>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {Object.keys(menuOptions).sort().map(date => (
                <div key={date} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-8 space-y-6">
                  <h3 className="text-xl font-black text-white flex items-center gap-2"><Calendar className="text-amber-500" /> {date}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.keys(menuOptions[date]).map(time => (
                      <div key={time} className="space-y-4">
                        <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest">{time}</h4>
                        <div className="space-y-3">
                          {menuOptions[date][time as MealTime].map((opt, i) => {
                            const isSelected = selections.find(s => s.date === date && s.time === time && s.menuName === opt.menuName);
                            return (
                              <div key={i} onClick={() => toggleSelection(date, time as MealTime, opt.menuName)} className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'}`}>
                                <div className="font-bold text-white mb-1 flex items-center justify-between">
                                  {opt.menuName}
                                  {isSelected && <CheckCircle2 size={16} className="text-amber-500" />}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleCalculateEvent} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all">최종 재료 산출 <ChevronRight /></button>
          </div>
        )}

        {/* --- 최종 결과 리포트 (조회 결과 화면) --- */}
        {((mode === 'singleRecipe' && step === 2) || (mode === 'customPlan' && step === 2) || (mode === 'eventPlan' && step === 3) || (mode === 'savedReports' && step === 2)) && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-10 no-print">
              <div className="text-center md:text-left flex items-center gap-4">
                <button onClick={mode === 'savedReports' ? () => { setMode('savedReports'); setStep(1); } : resetToHome} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all"><ArrowLeft size={24}/></button>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase">REPORT</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {mode !== 'savedReports' ? (
                  <button 
                    onClick={handleSaveToArchive} 
                    className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all border ${saveStatus ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {saveStatus ? <CheckCircle2 size={18}/> : <Save size={18}/>} 
                    {saveStatus ? '저장 완료' : '리포트 저장'}
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      const currentId = savedReports.find(r => r.data === finalPlan)?.id;
                      if (currentId) deleteSavedReport(e as any, currentId);
                    }}
                    className="px-5 py-3 rounded-2xl font-bold flex items-center gap-2 bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all"
                  >
                    <Trash2 size={18}/> 리포트 삭제
                  </button>
                )}
                <button onClick={saveAsHTML} className="bg-slate-800 text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-all border border-slate-700"><FileCode size={18}/> HTML 저장</button>
                <button onClick={exportToCSV} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg"><Download size={18}/> CSV 다운로드</button>
                <button onClick={() => window.print()} className="bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-amber-400 transition-all"><Printer size={18}/> 인쇄</button>
              </div>
            </div>

            <div id="report-content" className="space-y-12">
              {/* 통합 발주 테이블 */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden text-slate-900 border-8 border-slate-100 print-break-inside-avoid">
                <div className="bg-slate-950 text-white px-10 py-7 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500 w-12 h-12 rounded-2xl flex items-center justify-center"><ClipboardList className="text-slate-950 w-7 h-7" /></div>
                    <h3 className="text-2xl font-black">통합 식재료 발주 목록</h3>
                  </div>
                </div>
                <div className="p-8">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-4 border-slate-100">
                          <th className="py-6 px-6 text-slate-400 uppercase text-xs font-black tracking-widest">품목명</th>
                          <th className="py-6 px-6 text-slate-400 uppercase text-xs font-black tracking-widest text-right">총 소요량</th>
                          <th className="py-6 px-6 text-slate-400 uppercase text-xs font-black tracking-widest text-center">단위</th>
                          <th className="py-6 px-6 text-slate-400 uppercase text-xs font-black tracking-widest">사용 상세 내역</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {totalIngredients.length > 0 ? totalIngredients.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-6 px-6"><div className="font-black text-slate-800 text-lg">{item.name}</div></td>
                            <td className="py-6 px-6 text-right"><span className="font-black text-3xl text-slate-900">{item.totalAmount.toLocaleString()}</span></td>
                            <td className="py-6 px-6 text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl font-bold text-sm">{item.unit}</span></td>
                            <td className="py-6 px-6">
                              <div className="flex flex-wrap gap-2">
                                {item.breakdown.map((b, bi) => (
                                  <div key={bi} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600">
                                    {b.menuName}: <span className="text-amber-700">{b.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="py-10 text-center text-slate-400">데이터가 없습니다.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* 개별 메뉴 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {finalPlan.map((meal, idx) => (
                  <div key={idx} className="bg-slate-800/60 border border-slate-700 rounded-[2.5rem] p-10 space-y-8 flex flex-col h-full shadow-xl print-break-inside-avoid">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-widest">
                          <Calendar size={14} /> {meal.date} | {meal.mealTime}
                        </div>
                        <h4 className="text-3xl font-black text-white">{meal.menuName}</h4>
                      </div>
                      <div className="bg-slate-950 px-4 py-2 rounded-2xl text-slate-400 text-sm font-black border border-slate-800">
                        {meal.headCount || plan.headCount}명
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">필요 식재료</h5>
                      <div className="bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-700">
                        <table className="w-full text-left text-sm">
                          <tbody className="divide-y divide-slate-800">
                            {meal.ingredients.map((ing, ii) => (
                              <tr key={ii}>
                                <td className="py-3 px-4 text-slate-300">{ing.name}</td>
                                <td className="py-3 px-4 text-right font-black text-white">{ing.amount}{ing.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4 flex-grow">
                      <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest">대량 조리 공정</h5>
                      <ul className="space-y-4">
                        {meal.steps.map((step, si) => (
                          <li key={si} className="flex gap-4 text-sm text-slate-300 leading-relaxed bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                            <span className="bg-slate-800 text-amber-500 w-6 h-6 rounded-lg flex items-center justify-center font-black shrink-0 text-xs">{si + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-40 border-t border-slate-800 py-16 text-center text-slate-600 no-print">
        <div className="max-w-2xl mx-auto space-y-6 px-6">
          <ChefHat className="mx-auto w-12 h-12 text-slate-700" />
          <p className="text-sm font-bold text-slate-500">
            오세원 5@ssu.ac.kr
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <span className="text-[10px] bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-700">Data Saved Automatically</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
