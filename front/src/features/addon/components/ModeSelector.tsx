import { useModeSelector } from '../hooks/useModeSelector';

export default function ModeSelector() {
  const {
    step,
    selectedIds,
    activeMode,
    seconds,
    isPaused,
    setIsPaused,
    toggleParticipant,
    startMode,
    reset,
    formatTime,
    participants,
    loading,
    error
  } = useModeSelector();

  return (
    <div className="flex flex-col h-screen bg-[#FCFCF4] text-black font-sans antialiased overflow-hidden">
      {/* HEADER: Matches Mockup */}
      <header className="p-6 pt-8 pb-4">
        <h1 className="text-[20px] font-black tracking-tighter uppercase mb-6">Polyglan</h1>

        {step === 'selection' && (
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999999] mb-4">
            Participantes Ativos
          </h2>
        )}
      </header>

      {step === 'selection' ? (
        <div className="flex flex-col flex-grow">
          {/* LIST: Correct spacing and borders */}
          <div className="flex-grow overflow-y-auto px-6 pb-6 w-full max-w-[500px] mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#999999] opacity-70">
                <div className="w-8 h-8 rounded-full border-[3px] border-[#999999] border-t-transparent animate-spin mb-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Carregando...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500 font-bold text-sm">
                {error}
              </div>
            ) : participants.length === 0 ? (
              <div className="mt-12 text-center opacity-30 text-xs italic tracking-tight">
                Nenhum participante encontrado
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {participants.map((user) => (
                  <div
                    key={user.conferenceRecordUserId}
                    onClick={() => toggleParticipant(user.conferenceRecordUserId)}
                    className={`flex items-center p-3 min-h-[60px] rounded-2xl cursor-pointer transition-all border
                      ${selectedIds.includes(user.conferenceRecordUserId)
                        ? 'bg-white border-black shadow-sm ring-1 ring-black'
                        : 'bg-[#F4F4EC] border-transparent hover:bg-white'} w-full`}
                  >
                    <div className="w-9 h-9 shrink-0 rounded-full bg-black flex items-center justify-center text-[#FCFCF4] text-xs font-bold mr-4">
                      {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : '?'}
                    </div>
                    <span className="text-[14px] font-bold flex-grow tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{user.name}</span>
                    <div className={`w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                      ${selectedIds.includes(user.conferenceRecordUserId) ? 'border-black bg-black' : 'border-[#999999]'}`}>
                      {selectedIds.includes(user.conferenceRecordUserId) && (
                        <div className="w-[8px] h-[8px] rounded-full bg-[#FCFCF4]"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER: Stacked Black/White buttons as in Mockup */}
          {selectedIds.length > 0 && !loading && !error && (
            <footer className="p-6 bg-[#FCFCF4] border-t border-[#F0EEE6]">
              <div className="flex flex-col gap-3 w-full max-w-[500px] mx-auto">
                <button
                  onClick={() => startMode('História')}
                  className="w-full py-4 rounded-full bg-black text-white font-bold text-[11px] uppercase tracking-[0.15em] transition-transform active:scale-[0.98]"
                >
                  Iniciar História
                </button>

                {selectedIds.length >= 2 && (
                  <button
                    onClick={() => startMode('Debate')}
                    className="w-full py-4 rounded-full bg-white text-black border-2 border-black font-bold text-[11px] uppercase tracking-[0.15em] transition-transform active:scale-[0.98]"
                  >
                    Modo Debate
                  </button>
                )}
              </div>
              <div className="text-[9px] text-center uppercase tracking-widest text-[#999999] mt-4 font-bold flex flex-col gap-1">
                <span>{selectedIds.length} selecionado(s) para a atividade</span>
                {selectedIds.length < 2 && (
                  <span className="opacity-50">(Selecione +1 para modo debate)</span>
                )}
              </div>
            </footer>
          )}
        </div>
      ) : (
        /* SCREEN: Activity Timer */
        <div className="flex flex-col items-center justify-center h-full p-8 bg-[#FCFCF4] animate-in fade-in duration-500">
          <div className="px-4 py-1.5 border-2 border-black rounded-full text-[11px] font-black uppercase tracking-widest mb-6">
            {activeMode}
          </div>
          <div className="text-[88px] font-light tracking-tighter tabular-nums mb-4">
            {formatTime(seconds)}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {participants.filter(u => selectedIds.includes(u.conferenceRecordUserId)).map((u, i, arr) => (
              <span key={u.conferenceRecordUserId} className="text-[12px] font-bold text-[#999999] tracking-tighter flex items-center">
                {u.name.toUpperCase()} {i < arr.length - 1 && <span className="mx-2 opacity-50">•</span>}
              </span>
            ))}
          </div>
          <div className="flex mt-16 gap-10">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-[12px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              {isPaused ? "Retomar" : "Pausar"}
            </button>
            <button
              onClick={reset}
              className="text-[12px] font-black uppercase tracking-widest text-red-600 hover:opacity-60 transition-opacity"
            >
              Finalizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
