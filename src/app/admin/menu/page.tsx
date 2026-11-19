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
  Trash2,
  FolderPlus,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatRupees } from '@/lib/currency';

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');

  // Dish Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('250');
  const [imageUrl, setImageUrl] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [prepTimeMin, setPrepTimeMin] = useState('15');
  const [submitting, setSubmitting] = useState(false);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Clear All Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (!confirm(`Are you sure you want to delete "${itemName}" from the menu?`)) {
      return;
    }

    try {
      const res = await api.admin.deleteMenuItem(id);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success(`"${itemName}" deleted from menu.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete dish');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Please enter category name');
      return;
    }

    try {
      setCreatingCat(true);
      const res = await api.admin.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        sortOrder: categories.length + 1,
      });

      if (res.success && res.category) {
        toast.success(`Category "${res.category.name}" created!`);
        setCategories((prev) => [...prev, res.category]);
        setCategoryId(res.category.id);
        setIsCatModalOpen(false);
        setNewCatName('');
        setNewCatDesc('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Delete category "${catName}" and all dishes inside it?`)) {
      return;
    }

    try {
      const res = await api.admin.deleteCategory(catId);
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
        setItems((prev) => prev.filter((i) => i.categoryId !== catId));
        if (selectedCat === catId) setSelectedCat('all');
        toast.success(`Category "${catName}" deleted.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  const handleClearAllMenu = async () => {
    try {
      setClearing(true);
      const res = await api.admin.clearAllMenu();
      if (res.success) {
        setItems([]);
        setCategories([]);
        setSelectedCat('all');
        setIsClearModalOpen(false);
        toast.success('All menu items and categories cleared! You can now add dishes manually.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear menu');
    } finally {
      setClearing(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      toast.error('Please enter dish name, category, and price in Rupees');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.admin.createMenuItem({
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        imageUrl:
          imageUrl.trim() ||
          (isVeg
            ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
            : 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'),
        isVeg,
        isAvailable: true,
        prepTimeMin: parseInt(prepTimeMin, 10) || 15,
      });

      if (res.success) {
        toast.success(`Added "${res.item.name}" (₹${res.item.price}) to menu!`);
        setIsModalOpen(false);
        setName('');
        setDescription('');
        setImageUrl('');
        setPrice('250');
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Menu Catalog & Price Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage food, beverages, and desserts. All prices in Indian Rupees (₹).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {items.length > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Menu</span>
            </button>
          )}

          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            <span>+ Add Category</span>
          </button>

          <button
            onClick={() => {
              if (categories.length === 0) {
                toast.info('Please create at least one category first before adding dishes.');
                setIsCatModalOpen(true);
                return;
              }
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Dish</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search dish name, description..."
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
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((c) => (
            <div key={c.id} className="inline-flex items-center shrink-0 group">
              <button
                onClick={() => setSelectedCat(c.id)}
                className={`px-3 py-2 rounded-l-xl text-xs font-semibold cursor-pointer transition-all ${
                  selectedCat === c.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border-y border-l border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.name}
              </button>
              <button
                onClick={() => handleDeleteCategory(c.id, c.name)}
                title="Delete this category"
                className={`px-1.5 py-2 rounded-r-xl text-xs transition-all border-y border-r cursor-pointer ${
                  selectedCat === c.id
                    ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Grid / Empty States */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-xs">Loading menu catalog...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Utensils className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Menu is Currently Empty</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All sample dishes have been removed. Start by creating your hotel menu categories (e.g. Starters, Main Course, Drinks) and adding your dishes manually.
            </p>
          </div>
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Category</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
          <Utensils className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs">No dishes found in this category.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs inline-flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dish to {selectedCat === 'all' ? 'Menu' : 'Category'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-slate-900/90 border ${
                item.isAvailable ? 'border-slate-800' : 'border-red-500/30 opacity-70'
              } flex flex-col justify-between space-y-3 transition-all hover:border-slate-700`}
            >
              <div className="flex gap-3">
                {item.imageUrl && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative">
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
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-bold text-sm text-white truncate">{item.name}</h3>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      title="Delete dish"
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 -mr-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description || 'Freshly prepared by hotel chefs.'}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="font-black text-sm text-amber-400">
                      {formatRupees(item.price)}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center space-x-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.prepTimeMin}m</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {item.isVeg ? 'Veg' : 'Non-Veg'}
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
                      <span>Mark In Stock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Menu Dish */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-2">
              <Utensils className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Add New Menu Dish</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Add a culinary offering. Rates are in Indian Rupees (₹).
            </p>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Menu Category
                </label>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Dish / Item Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paneer Butter Masala, Chicken Biryani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description & Ingredients
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe ingredients, portion size, flavor notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Price in Rupees (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      placeholder="250"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Est. Prep Time (mins)
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
                  Dish Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://... (Leave blank for default food image)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="vegToggle"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                />
                <label htmlFor="vegToggle" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Vegetarian Dish (Green Tag)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Dish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-amber-400 mb-2">
              <FolderPlus className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Create Menu Category</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Categories group dishes on the in-room QR menu (e.g. Starters, Biryani, Curries, Beverages).
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starters & Appetizers, Tandoori Specials"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Freshly spiced clay-oven delicacies"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCat}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {creatingCat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Clear All Confirmation */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white">Clear All Menu Items?</h2>
            <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
              This will permanently delete all current menu items and categories from the database so you can add your custom menu manually.
            </p>

            <div className="flex items-center justify-center space-x-3">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearAllMenu}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center space-x-2 disabled:opacity-50"
              >
                {clearing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Clear Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
