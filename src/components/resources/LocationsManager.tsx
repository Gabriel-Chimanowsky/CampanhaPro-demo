import * as React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTeam } from '../../contexts/TeamContext';
import Input from '../ui/Input';
import { TrashIcon } from '../icons';

const LocationsManager: React.FC = () => {
    const { locations, addLocation, deleteLocation, loadRioBairros } = useTeam();
    const [newLocationName, setNewLocationName] = React.useState('');
    const [newMunicipality, setNewMunicipality] = React.useState('Rio de Janeiro');

    const handleAddLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLocationName.trim() && newMunicipality.trim()) {
            addLocation({ 
                name: newLocationName.trim(), 
                municipality: newMunicipality.trim() 
            });
            setNewLocationName('');
        }
    }

    const handleDelete = (id: string | number) => {
        deleteLocation(id);
    }

    const handleLoadBairros = () => {
        loadRioBairros();
    }

    return (
        <Card>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h3 className="text-lg font-bold text-slate-300">Localidades de Atuação</h3>
                <Button onClick={handleLoadBairros} variant="secondary">
                    Carregar Bairros do Estado do RJ
                </Button>
            </div>
            <form onSubmit={handleAddLocation} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6">
                <Input
                    label="Município"
                    id="new-municipality"
                    value={newMunicipality}
                    onChange={(e) => setNewMunicipality(e.target.value)}
                    placeholder="Ex: Rio de Janeiro"
                />
                <Input
                    label="Bairro"
                    id="new-location"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Ex: Copacabana"
                />
                <Button type="submit" className="self-end h-[42px]">Adicionar</Button>
            </form>

            <div className="max-h-96 overflow-y-auto pr-2">
                <ul className="space-y-2">
                    {locations.map(location => (
                        <li key={location.id} className="bg-slate-800 p-3 rounded-md flex justify-between items-center">
                            <div>
                                <span className="font-bold text-slate-200">{location.name}</span>
                                <span className="text-xs text-slate-400 block uppercase tracking-wider">{location.municipality}</span>
                            </div>
                            <button onClick={() => handleDelete(location.id)} className="text-red-400 hover:text-red-300 p-2"><TrashIcon className="h-4 w-4" /></button>
                        </li>
                    ))}
                </ul>
                {locations.length === 0 && <p className="text-center py-8 text-slate-400">Nenhuma localidade cadastrada.</p>}
            </div>
        </Card>
    );
};

export default LocationsManager;
