type Language = "en" | "hi" | "or";

interface LanguageSwitcherProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

export default function LanguageSwitcher({
  language,
  setLanguage,
}: LanguageSwitcherProps) {
  const languages = [
    { code: "en" as Language, label: "EN" },
    { code: "hi" as Language, label: "हिन्दी" },
    { code: "or" as Language, label: "ଓଡ଼ିଆ" },
  ];

  return (
    <div className="flex items-center rounded-full border border-[#d4ddd5] bg-white p-1 shadow-sm">
      {languages.map((item) => (
        <button
          key={item.code}
          onClick={() => setLanguage(item.code)}
          className={`rounded-full px-3 py-2 text-xs font-bold transition ${
            language === item.code
              ? "bg-[#173f2a] text-white"
              : "text-[#68736b] hover:bg-[#eef3ee] hover:text-[#173f2a]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}