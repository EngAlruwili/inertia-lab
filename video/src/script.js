// Voice-over script: English narration + Arabic subtitles.
// `scene` groups lines into visual scenes.
export const SCRIPT = [
  { scene: 'trip', en: 'This power plant just tripped offline.', ar: 'هذه المحطة خرجت عن الخدمة للتو.' },
  { scene: 'trip', en: 'Watch what happens to the grid.', ar: 'لنرَ ماذا يحدث للشبكة.' },

  { scene: 'inertia', en: 'In a traditional grid, every generator spins at exactly fifty hertz.', ar: 'في الشبكة التقليدية، كل مولّد يدور بتردد خمسين هيرتز بالضبط.' },
  { scene: 'inertia', en: 'Those spinning rotors store kinetic energy. We call it inertia.', ar: 'هذه الأجزاء الدوّارة تخزّن طاقة حركية، ونسمّيها القصور الذاتي.' },
  { scene: 'inertia', en: 'When a plant trips, inertia slows the fall of frequency.', ar: 'عندما تخرج محطة عن الخدمة، يُبطئ القصور الذاتي هبوط التردد.' },

  { scene: 'renewables', en: 'But solar and wind connect through inverters, and they store zero inertia.', ar: 'لكن الطاقة الشمسية والرياح تتصل عبر العواكس، ولا تخزّن أي قصور ذاتي.' },
  { scene: 'renewables', en: 'At ninety percent renewables, the same trip makes frequency fall nine times faster.', ar: 'عند تسعين بالمئة طاقة متجددة، يجعل العطل نفسه التردد يهبط أسرع بتسع مرات.' },

  { scene: 'cliff', en: 'Sweep renewables from zero to ninety-five percent, and you find the inertia cliff.', ar: 'ارفع نسبة الطاقة المتجددة من صفر إلى خمسة وتسعين بالمئة، وسيظهر منحدر القصور الذاتي.' },
  { scene: 'cliff', en: 'Past this point, the grid starts cutting power to customers.', ar: 'بعد هذه النقطة، تبدأ الشبكة بفصل الكهرباء عن المشتركين.' },

  { scene: 'battery', en: 'So we add a fifteen hundred megawatt battery.', ar: 'لذلك نضيف بطارية بقدرة ألف وخمسمئة ميغاواط.' },
  { scene: 'battery', en: "A grid-following battery waits to measure frequency first. By then, it's too late.", ar: 'البطارية التابعة للشبكة تنتظر قياس التردد أولًا، وحينها يكون الأوان قد فات.' },
  { scene: 'battery', en: 'A grid-forming battery acts like a virtual synchronous machine, and responds in milliseconds.', ar: 'أما البطارية المُشكِّلة للشبكة فتعمل كآلة تزامنية افتراضية، وتستجيب خلال أجزاء من الثانية.' },

  { scene: 'results', en: 'Same battery. Same megawatts. Zero load shed.', ar: 'البطارية نفسها، والقدرة نفسها، ودون فصل أي حمل.' },
  { scene: 'results', en: 'The only difference is the control.', ar: 'الفرق الوحيد هو طريقة التحكّم.' },

  { scene: 'outro', en: 'Inertia Lab is open source, and runs right in your browser.', ar: 'مختبر القصور الذاتي مفتوح المصدر، ويعمل مباشرة من متصفحك.' },
  { scene: 'outro', en: 'The link is in the comments. Go break a grid.', ar: 'الرابط في التعليقات. جرّب وأسقِط الشبكة بنفسك.' },
];
