import { Church, Globe, MapPin } from 'lucide-react';

const items = [
  {
    icon: <Church size={22} className="text-primary" />,
    label: 'Ministry Type',
    value: 'Interdenominational',
    sub: 'Open to all believers',
  },
  {
    icon: <Globe size={22} className="text-primary" />,
    label: 'Events & Conferences',
    value: 'International Quivers Conf.',
    sub: 'Annual gathering',
  },
  {
    icon: <MapPin size={22} className="text-primary" />,
    label: 'Based In',
    value: 'Nigeria',
    sub: 'Reaching the nations',
  },
];

export default function InfoStrip() {
  return (
    <div className="bg-bg-alt border-y border-border py-10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex flex-col items-center text-center gap-1.5 py-5 px-8 ${
                i < items.length - 1 ? 'md:border-r border-b md:border-b-0 border-border' : ''
              }`}
            >
              <div className="mb-1">{item.icon}</div>
              <div className="text-[9.5px] font-bold tracking-[3px] uppercase text-primary">
                {item.label}
              </div>
              <div className="font-heading text-[17px] text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
