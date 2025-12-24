'use client';

import { useState, useMemo } from 'react';
import { Car, CarEvent, EventType } from '@/app/lib/types';
import { formatDate } from '@/app/lib/utils';

interface EventLogSectionProps {
  car: Car;
}

export default function EventLogSection({ car }: EventLogSectionProps) {
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const eventTypes: Array<{ value: EventType | 'all'; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'car_created', label: 'Fahrzeug erstellt' },
    { value: 'car_updated', label: 'Fahrzeug aktualisiert' },
    { value: 'mileage_update', label: 'Kilometerstand' },
    { value: 'tuv_update', label: 'TÜV' },
    { value: 'inspection_update', label: 'Inspektion' },
    { value: 'tire_change', label: 'Reifenwechsel' },
    { value: 'insurance_update', label: 'Versicherung' },
  ];

  const filteredAndSortedEvents = useMemo(() => {
    let events = [...(car.eventLog || [])];

    // Filter by type
    if (filterType !== 'all') {
      events = events.filter(event => event.type === filterType);
    }

    // Sort by date
    events.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return events;
  }, [car.eventLog, filterType, sortOrder]);

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'car_created':
        return '🚗';
      case 'car_updated':
        return '✏️';
      case 'mileage_update':
        return '📊';
      case 'tuv_update':
        return '✅';
      case 'inspection_update':
        return '🔧';
      case 'tire_change':
        return '🛞';
      case 'insurance_update':
        return '🛡️';
      default:
        return '📝';
    }
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case 'car_created':
        return 'bg-blue-500/20 text-blue-400';
      case 'car_updated':
        return 'bg-purple-500/20 text-purple-400';
      case 'mileage_update':
        return 'bg-green-500/20 text-green-400';
      case 'tuv_update':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'inspection_update':
        return 'bg-orange-500/20 text-orange-400';
      case 'tire_change':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'insurance_update':
        return 'bg-indigo-500/20 text-indigo-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-foreground">Event-Log</h2>
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="rounded-lg border border-border bg-input/60 px-3 py-1.5 text-sm text-foreground"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {eventTypes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterType(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterType === value
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-input/60 text-muted-foreground hover:bg-input/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAndSortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Keine Events gefunden</p>
          </div>
        ) : (
          filteredAndSortedEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border"
            >
              <div className={`text-2xl flex-shrink-0`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventColor(event.type)}`}>
                    {eventTypes.find(t => t.value === event.type)?.label || event.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.date)}
                  </span>
                </div>
                <p className="text-sm text-foreground">{event.description}</p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
