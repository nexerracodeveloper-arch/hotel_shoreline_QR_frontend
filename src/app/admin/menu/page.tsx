'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('20');
  const [imageUrl, setImageUrl] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [prepTimeMin, setPrepTimeMin] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getMenuItems(),
      ]);
      if (catsRes.success) {
        setCategories(catsRes.categories || []);
        if (catsRes.categories?.length > 0 && !categoryId) {
          setCategoryId(catsRes.categories[0].id);
        }
      }
      if (itemsRes.success) setItems(itemsRes.items || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStock = async (id: string) => {
    try {
      const res = await api.admin.toggleStock(id);
      if (res.success) {
        setItems((prev) => prev.map((i) => (i.id === id ? res.item : i)));
        toast.success(`${res.item.name} is now ${res.item.isAvailable ? 'In Stock' : 'Sold Out'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      toast.error('Please enter name, category and price');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.admin.createMenuItem({
        categoryId,
        name,
        description,
        price: parseFloat(price),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        isVeg,
        isAvailable: true,
        prepTimeMin: parseInt(prepTimeMin, 10) || 15,
      });

      if (res.success) {
        toast.success(`Added ${res.item.name} to menu!`);
        setIsModalOpen(false);
        setName('');
        setDescription('');
        setImageUrl('');
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCat !== 'all' && item.categoryId !== selectedCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Menu Catalog & Stock Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage food, beverage, and dessert items offered to guests via room QR codes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Dish</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search dish name, ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
              selectedCat === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                selectedCat === c.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              {c.name.split('&')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Loading culinary catalog...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
          No menu items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-slate-900/90 border ${
                item.isAvailable ? 'border-slate-800' : 'border-red-500/30 opacity-70'
              } flex flex-col justify-between space-y-3 transition-all`}
            >
              <div className="flex gap-3">
                {item.imageUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                        item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">{item.name}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="font-extrabold text-sm text-amber-400">
                      ${Number(item.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.prepTimeMin}m</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Toggle Action */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    item.isAvailable ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {item.isAvailable ? 'Available' : 'Sold Out'}
                </span>

                <button
                  onClick={() => handleToggleStock(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${
                    item.isAvailable
                      ? 'bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {item.isAvailable ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>In Stock</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-red-400" />
                      <span>Mark Available</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-white">Add New Menu Dish</h2>
              <p className="text-xs text-slate-400 mt-1">
                This item will be instantly available on in-room QR menus.
              </p>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Dish / Beverage Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Truffle Infused Risotto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    value={prepTimeMin}
                    onChange={(e) => setPrepTimeMin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, presentation, flavor profile..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="veg"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="veg" className="text-xs text-slate-300 cursor-pointer">
                  Vegetarian Option
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save Menu Dish</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
