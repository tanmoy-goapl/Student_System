export function getStrengthClasses(strength: string) {
    switch (strength) {
        case 'weak':
            return {
                card:
                    'border-rose-500/20 bg-gradient-to-r from-rose-500/10 to-transparent',
                badge: 'bg-rose-500/15 text-rose-400',
            };

        case 'medium':
            return {
                card:
                    'border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-transparent',
                badge: 'bg-fuchsia-500/15 text-fuchsia-400',
            };

        case 'strong':
            return {
                card:
                    'border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent',
                badge: 'bg-emerald-500/15 text-emerald-400',
            };

        case 'neutral':
            return {
                card:
                    'border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent',
                badge: 'bg-cyan-500/15 text-cyan-300',
            };

        default:
            return {
                card:
                    'border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-transparent',
                badge: 'bg-blue-500/10 text-blue-300',
            };
    }
}