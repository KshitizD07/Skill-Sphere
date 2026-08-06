import { useState, useEffect, useRef } from 'react';
import { Building2, Search, HelpCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { COLLEGES } from '../../data/colleges';

export default function CollegeSelector({ value, onChange, labelBase, inputBase }) {
  // Check if initial value is custom ('Other')
  const isCustomValue = value && value !== '' && !COLLEGES.includes(value);

  const [isOther, setIsOther] = useState(!!isCustomValue);
  const [searchVal, setSearchVal] = useState(isCustomValue ? '' : value || '');
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef(null);

  // Sync state if value changes externally
  useEffect(() => {
    if (value === '') {
      setSearchVal('');
      setIsOther(false);
    } else if (COLLEGES.includes(value)) {
      setSearchVal(value);
      setIsOther(false);
    } else if (value) {
      setIsOther(true);
    }
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API fetch for hipolabs
  useEffect(() => {
    if (isOther || searchVal.trim().length < 3) {
      setApiSuggestions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const query = encodeURIComponent(searchVal);
        const res = await fetch(`http://universities.hipolabs.com/search?country=India&name=${query}`);
        if (res.ok) {
          const data = await res.json();
          const names = data.map((u) => u.name);
          // Remove duplicates and limit results
          const uniqueNames = Array.from(new Set(names)).slice(0, 15);
          setApiSuggestions(uniqueNames);
        }
      } catch (err) {
        console.error('Failed to fetch universities:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [searchVal, isOther]);

  // Filter local colleges based on search query
  const filteredLocal = COLLEGES.filter((c) => {
    if (c === 'Other') return false;
    return c.toLowerCase().includes(searchVal.toLowerCase());
  }).slice(0, 10);

  // Combine local and API suggestions without duplicates
  const combinedSuggestions = Array.from(new Set([...filteredLocal, ...apiSuggestions]));

  const handleSelect = (selectedName) => {
    setSearchVal(selectedName);
    onChange(selectedName);
    setIsOpen(false);
  };

  const switchToOther = () => {
    setIsOther(true);
    onChange(''); // Reset value to let user type from scratch
    setSearchVal('');
    setIsOpen(false);
  };

  const switchToDropdown = () => {
    setIsOther(false);
    onChange('');
    setSearchVal('');
  };

  if (isOther) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelBase}>Manual College/University Name</label>
          <button
            type="button"
            onClick={switchToDropdown}
            className="text-[10px] font-syne font-bold uppercase tracking-wider text-[#d97706] hover:underline flex items-center gap-1"
          >
            <ArrowLeft size={10} /> Select from List
          </button>
        </div>
        <div className="relative group">
          <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-primary transition-colors" size={15} />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBase} pl-10`}
            placeholder="Type your university/college name manually"
            required
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <label className={labelBase}>Institutional Affiliation <span className="text-error">*</span></label>
      <div className="relative group">
        <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#d97706] transition-colors" size={15} />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onChange(e.target.value); // Sync to parent state
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={`${inputBase} pl-10 focus:border-[#d97706]/60`}
          placeholder="Search college (e.g. IIT, NIT, VIT, BITS...)"
          required
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-text-muted">
          {loading ? (
            <Loader2 size={13} className="animate-spin text-[#d97706]" />
          ) : (
            <Search size={13} />
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-surface-high border border-outline-var/40 rounded-xs shadow-2xl z-[150] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          {combinedSuggestions.length > 0 ? (
            combinedSuggestions.map((name, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(name)}
                className="w-full text-left px-4 py-2.5 text-[11px] text-text-muted hover:text-text-primary hover:bg-[#d97706]/10 transition-colors font-syne uppercase tracking-wider border-b border-outline-var/10 last:border-0"
              >
                {name}
              </button>
            ))
          ) : (
            searchVal.trim() && !loading && (
              <div className="px-4 py-3 text-xs text-text-muted italic">
                No matching college found.
              </div>
            )
          )}
          
          {/* Always provide "Other" option at the bottom */}
          <button
            type="button"
            onClick={switchToOther}
            className="w-full text-left px-4 py-3 text-[11px] font-bold text-[#d97706] bg-[#d97706]/5 hover:bg-[#d97706]/10 transition-colors font-syne uppercase tracking-wider flex items-center gap-1.5 border-t border-outline-var/20"
          >
            <HelpCircle size={12} />
            Other (Specify manually...)
          </button>
        </div>
      )}
    </div>
  );
}
