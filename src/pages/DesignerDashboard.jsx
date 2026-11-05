import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import BillingTab from "../components/BillingTab";
import {
  Users,
  Image as ImageIcon,
  Settings,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Video,
  XCircle,
  Briefcase,
  MapPin,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  LogOut,
  ChevronLeft,
  Check,
  ChevronRight,
  Edit2,
  X,
  Lock,
  Star,
  Calendar,
  Zap,
  CheckCircle,
  CreditCard,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Home,
  Palette,
  Wallet,
  MessageSquare,
  Archive,
  ShieldAlert,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";
import { compressImage } from "../utils/imageCompression";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "../services/authService";
import {
  isProfessionalProfileComplete,
} from "../utils/designerApproval";
import ProfessionalProfileReviewStatus from "../components/ProfessionalProfileReviewStatus";

// --- HELPER TO PARSE PROJECT JSON DATA ---
const parseProjectCategory = (catStr) => {
  try {
    const parsed = JSON.parse(catStr);
    return parsed;
  } catch {
    return { categories: [catStr], description: "" };
  }
};

// --- HELPER: Parse the structured lead message ---
const parseLeadMessage = (messageStr) => {
  if (!messageStr) return { isStructured: false, rawMessage: "" };
  const scopeMatch = messageStr.match(/Project Scope:\s*(.+)/);
  const styleMatch = messageStr.match(/Preferred Style:\s*(.+)/);
  const budgetMatch = messageStr.match(/Budget Range:\s*(.+)/);
  const timelineMatch = messageStr.match(/Timeline:\s*(.+)/);
  const msgMatch = messageStr.match(/Client Message:\n([\s\S]*)/);
  if (scopeMatch || styleMatch || budgetMatch || timelineMatch) {
    return {
      isStructured: true,
      scope: scopeMatch ? scopeMatch[1].trim() : "N/A",
      style: styleMatch ? styleMatch[1].trim() : "N/A",
      budget: budgetMatch ? budgetMatch[1].trim() : "N/A",
      timeline: timelineMatch ? timelineMatch[1].trim() : "N/A",
      clientMessage: msgMatch ? msgMatch[1].trim() : "No additional message.",
    };
  }
  return { isStructured: false, rawMessage: messageStr };
};

// --- COMPONENT: ADD PROJECT MODAL (With Custom Rooms & Coupled Room Materials) ---
const AddProjectModal = ({ onClose, onAdd, designerId }) => {
  const [form, setForm] = useState({ title: "", place: "", description: "" });
  const [roomUploads, setRoomUploads] = useState({});
  const [roomMaterials, setRoomMaterials] = useState({});
  const [currentRoomInputs, setCurrentRoomInputs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const standardCategories = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Exterior", "Commercial Space"];
  const selectedCategories = Object.keys(roomUploads);
  const customCategories = selectedCategories.filter(cat => !standardCategories.includes(cat));

  const toggleCategory = (cat) => {
    setRoomUploads((prev) => {
      const updated = { ...prev };
      if (updated[cat]) {
        delete updated[cat];
      } else {
        updated[cat] = []; 
      }
      return updated;
    });
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    if (selectedCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This room is already added.");
      return;
    }
    setRoomUploads(prev => ({ ...prev, [trimmed]: [] }));
    setCustomCategory("");
    setShowCustomInput(false);
  };

  const handleAddMaterialForRoom = (category) => {
    const inputVal = (currentRoomInputs[category] || "").trim();
    if (!inputVal) return;

    setRoomMaterials((prev) => {
      const existing = prev[category] || [];
      if (existing.includes(inputVal)) return prev;
      return { ...prev, [category]: [...existing, inputVal] };
    });

    setCurrentRoomInputs((prev) => ({ ...prev, [category]: "" }));
  };

  const handleRemoveMaterialTag = (category, tagToRemove) => {
    setRoomMaterials((prev) => {
      const existing = prev[category] || [];
      const updated = existing.filter((t) => t !== tagToRemove);
      const newObj = { ...prev };
      if (updated.length === 0) {
        delete newObj[category];
      } else {
        newObj[category] = updated;
      }
      return newObj;
    });
  };

  const handleFileSelect = (e, category) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setRoomUploads((prev) => ({
        ...prev,
        [category]: [...prev[category], ...newFiles]
      }));
      e.target.value = "";
    }
  };

  const removeFile = (category, fileIndex) => {
    setRoomUploads((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, index) => index !== fileIndex)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCategories.length === 0) return toast.error("Please select at least one room category.");
    const hasImages = selectedCategories.some(cat => roomUploads[cat].length > 0);
    if (!hasImages) return toast.error("Please upload at least one image for your selected rooms.");

    setUploading(true);
    try {
      const projectDataString = JSON.stringify({
        categories: selectedCategories,
        description: form.description
      });

      const { data: projData, error: projError } = await supabase
        .from("designer_projects")
        .insert({
          designer_id: designerId,
          title: form.title,
          place: form.place, 
          project_category: projectDataString,
          room_materials: roomMaterials,
          status: "approved",
        })
        .select()
        .single();

      if (projError) throw projError;

      const uploadedImages = [];
      let isFirstImageCover = true; 

      for (const category of selectedCategories) {
        const files = roomUploads[category];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const compressedFile = await compressImage(file, { maxWidth: 2048, quality: 0.8 });
          const fileExt = compressedFile.name.split(".").pop();
          const fileName = `${designerId}/${projData.id}/${category}_${Date.now()}_${i}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("portfolio").upload(fileName, compressedFile);
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from("portfolio").getPublicUrl(fileName);
          uploadedImages.push({
            project_id: projData.id,
            image_url: data.publicUrl,
            room_category: category, 
            is_cover: isFirstImageCover,
          });
          isFirstImageCover = false; 
        }
      }

      await supabase.from("project_images").insert(uploadedImages);
      onAdd({ ...projData, project_images: uploadedImages });
      toast.success("Project Published Successfully!");
      onClose();
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in transition-all">
      <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Plus size={24} className="text-brand-accent p-1 bg-brand-accent/10 rounded-lg" /> Add New Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Project Title</label>
              <input
                type="text"
                placeholder="E.g., Modern Minimalist Villa"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Location / Place</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="E.g., Jubilee Hills"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 pl-10 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all"
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-900 mb-2">Project Details</label>
             <textarea
               placeholder="Describe the scope, the materials used..."
               className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none h-28 resize-none transition-all"
               value={form.description}
               onChange={(e) => setForm({ ...form, description: e.target.value })}
               required
             />
          </div>
          
          <div>
             <label className="block text-sm font-bold text-gray-900 mb-3">Which rooms did you design? (Select to upload photos & materials)</label>
             <div className="flex flex-wrap gap-2.5 mb-6 items-center">
               {standardCategories.map(cat => {
                 const isSelected = selectedCategories.includes(cat);
                 return (
                   <button
                     type="button"
                     key={cat}
                     onClick={() => toggleCategory(cat)}
                     className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                       isSelected 
                       ? "bg-gray-900 text-white border-gray-900 shadow-md" 
                       : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                     }`}
                   >
                     {isSelected && <CheckCircle size={14} className="text-white" />}
                     {cat}
                   </button>
                 );
               })}

               {customCategories.map(cat => (
                 <button
                   type="button"
                   key={cat}
                   onClick={() => toggleCategory(cat)}
                   className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 bg-gray-900 text-white border-gray-900 shadow-md"
                 >
                   <CheckCircle size={14} className="text-white" />
                   {cat}
                 </button>
               ))}

               {showCustomInput ? (
                 <div className="flex items-center gap-1.5 bg-white border border-brand-accent rounded-xl p-1 shadow-sm">
                   <input
                     type="text"
                     placeholder="E.g., Wine Cellar"
                     className="bg-transparent border-none outline-none text-sm px-3 py-1 w-36 text-gray-900 placeholder-gray-400"
                     value={customCategory}
                     onChange={(e) => setCustomCategory(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === "Enter") {
                         e.preventDefault();
                         handleAddCustomCategory();
                       }
                     }}
                     autoFocus
                   />
                   <button type="button" onClick={handleAddCustomCategory} className="bg-gray-900 text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                     <Check size={14} />
                   </button>
                   <button type="button" onClick={() => { setShowCustomInput(false); setCustomCategory(""); }} className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                     <X size={14} />
                   </button>
                 </div>
               ) : (
                 <button
                   type="button"
                   onClick={() => setShowCustomInput(true)}
                   className="px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-brand-accent hover:text-brand-accent transition-all flex items-center gap-2 bg-gray-50"
                 >
                   <Plus size={14} /> Custom Room
                 </button>
               )}
             </div>
          </div>

          {selectedCategories.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h3 className="font-bold text-gray-900">Upload Room Images & Materials</h3>
              {selectedCategories.map((category) => (
                <div key={category} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-brand-accent">{category} Photos</h4>
                    <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                      {roomUploads[category].length} Images
                    </span>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 hover:border-brand-accent bg-white rounded-xl p-6 text-center relative transition-all group cursor-pointer mb-4">
                    <input type="file" multiple accept="image/*" onChange={(e) => handleFileSelect(e, category)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="text-gray-400 group-hover:text-brand-accent mx-auto mb-2 transition-colors" size={24} />
                    <p className="text-gray-600 text-sm font-medium">Click to upload <span className="lowercase">{category}</span> images</p>
                  </div>
                  {roomUploads[category].length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 animate-fade-in mb-4">
                      {roomUploads[category].map((file, index) => (
                        <div key={index} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                          <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeFile(category, index)} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1 rounded-full transition-colors backdrop-blur-sm">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- ROOM MATERIALS TAG INPUT (Coupled directly underneath Image Upload) --- */}
                  <div className="pt-3 border-t border-gray-200/80 space-y-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Materials Used in {category}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Type material for ${category} (e.g. Quartz) & press Enter...`}
                        className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 outline-none focus:border-brand-accent transition-all"
                        value={currentRoomInputs[category] || ""}
                        onChange={(e) => setCurrentRoomInputs({ ...currentRoomInputs, [category]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMaterialForRoom(category);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMaterialForRoom(category)}
                        className="bg-gray-900 hover:bg-black text-white px-3.5 rounded-xl text-xs font-bold transition-all"
                      >
                        Add
                      </button>
                    </div>

                    {Array.isArray(roomMaterials[category]) && roomMaterials[category].length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {roomMaterials[category].map((tag) => (
                          <span
                            key={tag}
                            className="bg-brand-accent/10 text-brand-accent text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-brand-accent/20"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterialTag(category, tag)}
                              className="hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button disabled={uploading} className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="animate-spin" /> : "Publish Complete Project"}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENT: EDIT PROJECT MODAL (Room-Based & Coupled Room Materials) ---
const EditProjectModal = ({ project, designerId, onClose, onUpdate }) => {
  const parsedData = parseProjectCategory(project.project_category);
  const [form, setForm] = useState({
    title: project.title || "",
    place: project.place || "",
    description: parsedData.description || ""
  });

  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]); 
  
  const [roomUploads, setRoomUploads] = useState({});
  const [roomMaterials, setRoomMaterials] = useState(
    typeof project.room_materials === "string"
      ? (() => { try { return JSON.parse(project.room_materials); } catch { return {}; } })()
      : (project.room_materials || {})
  );
  const [currentRoomInputs, setCurrentRoomInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const standardCategories = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Exterior", "Commercial Space"];

  useEffect(() => {
    if (project.project_images) {
      setExistingImages(project.project_images);
      
      const existingCategories = [...new Set(project.project_images.map(img => img.room_category).filter(Boolean))];
      const initialRooms = {};
      existingCategories.forEach(cat => { initialRooms[cat] = []; });
      
      if (parsedData.categories) {
         parsedData.categories.forEach(cat => {
           if (!initialRooms[cat]) initialRooms[cat] = [];
         });
      }
      setRoomUploads(initialRooms);
    }
  }, [project]);

  const selectedCategories = Object.keys(roomUploads);
  const customCategories = selectedCategories.filter(cat => !standardCategories.includes(cat));

  const toggleCategory = (cat) => {
    setRoomUploads((prev) => {
      const updated = { ...prev };
      if (updated[cat]) delete updated[cat];
      else updated[cat] = [];
      return updated;
    });
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategory.trim();
    if (!trimmed) return;
    if (selectedCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) return toast.error("Already added.");
    setRoomUploads(prev => ({ ...prev, [trimmed]: [] }));
    setCustomCategory("");
    setShowCustomInput(false);
  };

  const handleAddMaterialForRoom = (category) => {
    const inputVal = (currentRoomInputs[category] || "").trim();
    if (!inputVal) return;

    setRoomMaterials((prev) => {
      const existing = prev[category] || [];
      if (existing.includes(inputVal)) return prev;
      return { ...prev, [category]: [...existing, inputVal] };
    });

    setCurrentRoomInputs((prev) => ({ ...prev, [category]: "" }));
  };

  const handleRemoveMaterialTag = (category, tagToRemove) => {
    setRoomMaterials((prev) => {
      const existing = prev[category] || [];
      const updated = existing.filter((t) => t !== tagToRemove);
      const newObj = { ...prev };
      if (updated.length === 0) {
        delete newObj[category];
      } else {
        newObj[category] = updated;
      }
      return newObj;
    });
  };

  const handleFileSelect = (e, category) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setRoomUploads((prev) => ({ ...prev, [category]: [...prev[category], ...newFiles] }));
      e.target.value = null;
    }
  };

  const removeNewFile = (category, fileIndex) => {
    setRoomUploads((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, index) => index !== fileIndex)
    }));
  };

  const markExistingImageForDeletion = (img) => {
    setImagesToDelete(prev => [...prev, img.id]);
    setExistingImages(prev => prev.filter(i => i.id !== img.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCategories.length === 0) return toast.error("Select at least one room category.");
    
    setSaving(true);
    try {
      const projectDataString = JSON.stringify({
        categories: selectedCategories,
        description: form.description
      });

      await supabase
        .from("designer_projects")
        .update({ 
          title: form.title, 
          place: form.place,
          project_category: projectDataString,
          room_materials: roomMaterials
        })
        .eq("id", project.id);

      if (imagesToDelete.length > 0) {
        await supabase.from("project_images").delete().in('id', imagesToDelete);
      }

      const newImageRecords = [];
      for (const category of selectedCategories) {
        const files = roomUploads[category];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const compressedFile = await compressImage(file, { maxWidth: 2048, quality: 0.8 });
          const fileExt = compressedFile.name.split(".").pop();
          const fileName = `${designerId}/${project.id}/${category}_${Date.now()}_${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from("portfolio").upload(fileName, compressedFile);
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from("portfolio").getPublicUrl(fileName);
          newImageRecords.push({ 
            project_id: project.id, 
            image_url: data.publicUrl, 
            room_category: category,
            is_cover: false 
          });
        }
      }
      
      if (newImageRecords.length > 0) {
        await supabase.from("project_images").insert(newImageRecords);
      }

      const finalImages = [...existingImages, ...newImageRecords];
      onUpdate(project.id, { 
        ...form, 
        project_images: finalImages, 
        project_category: projectDataString,
        room_materials: roomMaterials
      });
      
      toast.success("Updated Successfully!");
      onClose();
    } catch {
      toast.error("Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in transition-all">
      <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-2xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 transition-colors">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Edit2 size={24} className="text-brand-accent p-1 bg-brand-accent/10 rounded-lg" /> Edit Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Project Title</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-brand-accent outline-none"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Location / Place</label>
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-brand-accent outline-none"
                value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-900 mb-2">Project Details</label>
             <textarea
               className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-gray-900 focus:border-brand-accent outline-none h-28 resize-none"
               value={form.description}
               onChange={(e) => setForm({ ...form, description: e.target.value })}
               required
             />
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-900 mb-3">Categories & Rooms</label>
             <div className="flex flex-wrap gap-2.5 mb-6 items-center">
               {standardCategories.map(cat => {
                 const isSelected = selectedCategories.includes(cat);
                 return (
                   <button
                     type="button"
                     key={cat}
                     onClick={() => toggleCategory(cat)}
                     className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                       isSelected 
                       ? "bg-gray-900 text-white border-gray-900 shadow-md" 
                       : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                     }`}
                   >
                     {isSelected && <CheckCircle size={14} className="text-white" />}
                     {cat}
                   </button>
                 );
               })}
               {customCategories.map(cat => (
                 <button type="button" key={cat} onClick={() => toggleCategory(cat)} className="px-4 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 bg-gray-900 text-white border-gray-900 shadow-md">
                   <CheckCircle size={14} className="text-white" /> {cat}
                 </button>
               ))}
               {showCustomInput ? (
                 <div className="flex items-center gap-1.5 bg-white border border-brand-accent rounded-xl p-1 shadow-sm">
                   <input type="text" className="bg-transparent border-none outline-none text-sm px-3 py-1 w-36 text-gray-900" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} autoFocus />
                   <button type="button" onClick={handleAddCustomCategory} className="bg-gray-900 text-white p-1.5 rounded-lg"><Check size={14} /></button>
                 </div>
               ) : (
                 <button type="button" onClick={() => setShowCustomInput(true)} className="px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-gray-300 text-gray-500 hover:text-brand-accent bg-gray-50"><Plus size={14} /> Custom</button>
               )}
             </div>
          </div>

          {selectedCategories.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h3 className="font-bold text-gray-900">Manage Room Images & Materials</h3>
              {selectedCategories.map((category) => {
                const existingImgsForCat = existingImages.filter(img => img.room_category === category || (!img.room_category && category === "Living Room"));
                const newImgsForCat = roomUploads[category] || [];
                
                return (
                  <div key={category} className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <h4 className="font-bold text-brand-accent mb-3">{category}</h4>
                    
                    {existingImgsForCat.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Currently Published</p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {existingImgsForCat.map(img => (
                            <div key={img.id} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                              <img src={img.image_url} alt="existing" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => markExistingImageForDeletion(img)} className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full backdrop-blur-sm">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-2 border-dashed border-gray-300 hover:border-brand-accent bg-white rounded-xl p-4 text-center relative transition-all cursor-pointer mb-4">
                      <input type="file" multiple accept="image/*" onChange={(e) => handleFileSelect(e, category)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <Upload className="text-gray-400 mx-auto mb-1" size={20} />
                      <p className="text-gray-500 text-xs font-medium">Add more to {category}</p>
                    </div>

                    {newImgsForCat.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-green-600 mb-2 uppercase">Ready to Upload</p>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                          {newImgsForCat.map((file, index) => (
                            <div key={index} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden shadow-sm border-2 border-green-400">
                              <img src={URL.createObjectURL(file)} alt="new" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeNewFile(category, index)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full backdrop-blur-sm">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* --- ROOM MATERIALS TAG INPUT (Coupled directly underneath Image Upload) --- */}
                    <div className="pt-3 border-t border-gray-200/80 space-y-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Materials Used in {category}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Type material for ${category} (e.g. Quartz) & press Enter...`}
                          className="flex-1 bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 outline-none focus:border-brand-accent transition-all"
                          value={currentRoomInputs[category] || ""}
                          onChange={(e) => setCurrentRoomInputs({ ...currentRoomInputs, [category]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddMaterialForRoom(category);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMaterialForRoom(category)}
                          className="bg-gray-900 hover:bg-black text-white px-3.5 rounded-xl text-xs font-bold transition-all"
                        >
                          Add
                        </button>
                      </div>

                      {Array.isArray(roomMaterials[category]) && roomMaterials[category].length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {roomMaterials[category].map((tag) => (
                            <span
                              key={tag}
                              className="bg-brand-accent/10 text-brand-accent text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-brand-accent/20"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterialTag(category, tag)}
                                className="hover:text-red-500 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button disabled={saving} className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin mx-auto" /> : "Save Project Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};



const ClientContactDetails = ({ name, email, phone, city }) => {
  const contactFields = [
    { label: "Client", value: name },
    { label: "Phone", value: phone, hrefPrefix: "tel:" },
    { label: "Email", value: email, hrefPrefix: "mailto:" },
    { label: "City", value: city },
  ];

  return (
    <div aria-label="Client contact details" className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {contactFields.map(({ label, value, hrefPrefix }) => (
        <div key={label} className="min-w-0 bg-white border border-gray-200 p-3 rounded-xl flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">{label}</p>
            {typeof value === "string" && value.trim() ? (
              hrefPrefix ? (
                <a href={`${hrefPrefix}${value.trim()}`} className="text-gray-900 font-mono font-medium text-sm break-all">
                  {value.trim()}
                </a>
              ) : (
                <p className="text-gray-900 font-medium text-sm break-words">{value.trim()}</p>
              )
            ) : (
              <p className="text-gray-500 text-sm">Not provided</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- COMPONENT: LEAD CARD ---
const LeadCard = ({ lead, onStatusUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const details = parseLeadMessage(lead.message);

  const clientDetails = lead.assignedClientDetails || {};
  const clientName = clientDetails.client_name || lead.client_name;
  const clientPhone = clientDetails.client_phone || lead.client_phone;
  const clientEmail = clientDetails.client_email || lead.client_email;
  const clientCity = clientDetails.client_city || lead.client_city;

  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${lead.status === "accepted" ? "border-emerald-200" : "border-gray-200"}`}>
      {lead.status !== "accepted" && <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent/80"></div>}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isExpanded ? "mb-5 border-b border-gray-100 pb-5" : ""}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{clientName || "Client inquiry"}</h3>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${lead.status === "accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : lead.status === "on_hold" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
              {lead.status === "accepted" ? "Active Client" : lead.status === "on_hold" ? "On Hold" : "New Inquiry"}
            </span>
          </div>
          <p className="text-gray-500 text-sm flex items-center gap-1.5 font-medium"><Clock size={14} className="text-gray-400" /> {new Date(lead.updated_at || lead.created_at).toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="min-w-[140px] w-full md:w-auto">
          <button onClick={() => setIsExpanded(!isExpanded)} className={`w-full px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${isExpanded ? "bg-gray-100 text-gray-900 border-gray-200 shadow-inner" : "bg-white text-gray-700 border-gray-200"}`}>
            {isExpanded ? "Hide Details" : "View Details"} {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {details.isStructured ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1"><Home size={12} className="inline"/> Scope</p><p className="text-gray-900 font-semibold text-sm truncate">{details.scope}</p></div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1"><Palette size={12} className="inline"/> Style</p><p className="text-gray-900 font-semibold text-sm truncate">{details.style}</p></div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1"><Wallet size={12} className="inline"/> Budget</p><p className="text-emerald-700 font-bold text-sm truncate">{details.budget}</p></div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1"><Calendar size={12} className="inline"/> Timeline</p><p className="text-gray-900 font-semibold text-sm truncate">{details.timeline}</p></div>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100"><p className="text-[10px] text-blue-500 font-bold uppercase mb-1"><MessageSquare size={12} className="inline"/> Client Message</p><p className="text-gray-700 text-sm leading-relaxed italic">"{details.clientMessage}"</p></div>
            </div>
          ) : ( <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 italic">"{details.rawMessage}"</p> )}

          <ClientContactDetails
            name={clientName}
            phone={clientPhone}
            email={clientEmail}
            city={clientCity}
          />

          <div className="mt-5 pt-5 border-t border-gray-100">
            {lead.status === "pending" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => onStatusUpdate(lead.id, "accepted")} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><UserCheck size={18} /> Accept Active</button>
                <button onClick={() => onStatusUpdate(lead.id, "on_hold")} className="flex-1 bg-yellow-50 text-yellow-700 border border-yellow-200 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Clock size={18} /> Keep on Hold</button>
                <button onClick={() => { if (window.confirm("Permanently delete this row?")) onStatusUpdate(lead.id, "delete"); }} className="flex items-center gap-2 flex-1 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold"><Trash2 size={18} /> Delete</button>
              </div>
            )}
            {lead.status === "accepted" && (
              <div className="flex justify-end gap-3">
                <button onClick={() => onStatusUpdate(lead.id, "on_hold")} className="text-yellow-600 bg-yellow-50 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Clock size={16} /> Move to Hold</button>
                <button onClick={() => { if (window.confirm("Permanently delete this row?")) onStatusUpdate(lead.id, "delete"); }} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold"><Trash2 size={16} /> Delete</button>
              </div>
            )}
            {lead.status === "on_hold" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => onStatusUpdate(lead.id, "accepted")} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><UserCheck size={18} /> Resume to Active</button>
                <button onClick={() => { if (window.confirm("Permanently delete this row?")) onStatusUpdate(lead.id, "delete"); }} className="flex items-center justify-center gap-2 flex-1 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold"><Trash2 size={18} /> Delete</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



// --- IMPROVED PROJECT CARD ---
const ProjectCard = ({ proj, onDelete, onEdit }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = proj.project_images || [];
  const parsedData = parseProjectCategory(proj.project_category);
  const categories = parsedData.categories || [proj.project_category];
  
  const nextImage = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (images.length > 1) setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };
  const prevImage = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (images.length > 1) setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative flex flex-col hover:border-gray-300 hover:shadow-xl transition-all">
      <div className="aspect-video relative bg-gray-100 overflow-hidden">
        {images.length > 0 ? (
          <img src={images[currentImgIndex]?.image_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon size={40} />
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border border-white/20 z-20 pointer-events-none tracking-wider">
            {currentImgIndex + 1} / {images.length}
          </div>
        )}

        {images.length > 1 && (
          <>
            <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70 transition-colors z-20 backdrop-blur-md opacity-0 group-hover:opacity-100 border border-white/20">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full hover:bg-black/70 transition-colors z-20 backdrop-blur-md opacity-0 group-hover:opacity-100 border border-white/20">
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
              {images.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${idx === currentImgIndex ? "bg-white w-4" : "bg-white/50 w-1.5"}`} />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-3 right-3 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(proj)} className="p-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-blue-50 border border-gray-200 transition-colors shadow-sm">
            <Edit2 size={16} className="text-blue-600" />
          </button>
          <button onClick={() => onDelete(proj.id)} className="p-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-red-50 border border-gray-200 transition-colors shadow-sm">
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-gray-900 font-bold text-lg leading-tight mb-1 line-clamp-1">{proj.title}</h3>
        {proj.place && <p className="text-sm font-medium text-brand-accent mb-2 flex items-center gap-1"><MapPin size={12}/> {proj.place}</p>}
        <div className="flex flex-wrap gap-1.5 mb-2 mt-auto">
          {categories.slice(0, 3).map((cat, i) => (
             <span key={i} className="text-[10px] bg-gray-50 text-gray-600 font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-wider">
               {cat}
             </span>
          ))}
          {categories.length > 3 && (
             <span className="text-[10px] bg-gray-50 text-gray-600 font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-wider">
               +{categories.length - 3}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
const DesignerDashboard = ({ profileOnly = false }) => {
  const { id: adminDesignerId } = useParams(); 
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("leads");
  const [leadFilter, setLeadFilter] = useState("pending"); 
  const [designer, setDesigner] = useState(null);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [profileForm, setProfileForm] = useState({
    name: "", city: "", projects_completed: 0, about_text: "", experience_years: 0,
    video_link: "", video_link_2: "", designer_type: "interior",
    style_tags: [], logo_url: "", phone: "", email: "", is_public: true
  });
  const [newTag, setNewTag] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [user, setUser] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [paymentPromptDismissed, setPaymentPromptDismissed] = useState(false);

  // --- Calculate Days Remaining & Expiry Warning State ---
  const calculateDaysRemaining = (subscriptionEnd) => {
    if (!subscriptionEnd) return 0;
    const diff = new Date(subscriptionEnd) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysRemaining(designer?.subscription_end);

  const isPendingPayment = designer?.is_subscription_active === false && !designer?.subscription_end;
  const showActivationPrompt = !adminDesignerId &&
    designer?.is_verified === true &&
    isPendingPayment &&
    !paymentPromptDismissed;

  // Subscription state affects publication eligibility, not dashboard access.
  const isExpired = designer?.is_subscription_active === false && designer?.subscription_end && daysLeft < 0;

  const showWarningBanner = (designer?.is_subscription_active !== false) && Boolean(designer?.subscription_end) && (daysLeft >= 0 && daysLeft <= 7);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return navigate("/login");
        setUser(session.user);

        // Check if designer location is already set in users table
        const { data: userRec } = await supabase
          .from("users")
          .select("location")
          .eq("id", session.user.id)
          .maybeSingle();
        if (userRec?.location) {
          setHasLocation(true);
        }
        
        let designerData;
        if (adminDesignerId) {
          const { data: userData } = await supabase.from("users").select("role").eq("id", session.user.id).single();
          if (userData?.role !== "admin") return navigate("/");
          const { data: targetDesigner } = await supabase.from("designers").select("*").eq("id", adminDesignerId).maybeSingle();
          designerData = targetDesigner;
        } else {
          const { data: myDesigner } = await supabase.from("designers").select("*").eq("user_id", session.user.id).maybeSingle();
          designerData = myDesigner;
        }

        if (!designerData) {
          toast.error("Account not found.");
          return setLoading(false);
        }

        setDesigner(designerData);
        setIsProfileIncomplete(!isProfessionalProfileComplete(designerData));
        setProfileForm({
          name: designerData.name || "", city: designerData.city || "", projects_completed: designerData.projects_completed ?? 0,
          about_text: designerData.about_text || "", experience_years: designerData.experience_years || 0,
          video_link: designerData.video_link || "", video_link_2: designerData.video_link_2 || "",
          designer_type: designerData.designer_type || "interior", style_tags: designerData.style_tags || [],
          logo_url: designerData.logo_url || "", phone: designerData.phone || "", email: designerData.email || "",
          is_public: designerData.is_public !== false
        });

        if (designerData.projects_completed === undefined || designerData.projects_completed === null || !designerData.about_text) {
          setActiveTab("settings");
        }

        if (profileOnly) return;

        const { data: leadsData } = await supabase
          .from("connections")
          .select("*")
          .eq("designer_id", designerData.id)
          .order("updated_at", { ascending: false });
        const leadsWithClientDetails = await Promise.all((leadsData || []).map(async (lead) => {
          if (lead.id === null || lead.id === undefined) {
            return { ...lead, assignedClientDetails: null };
          }

          try {
            const { data, error: contactError } = await supabase.rpc(
              "get_assigned_client_details",
              { p_connection_id: lead.id }
            );
            if (contactError) throw contactError;
            const assignedClientDetails = Array.isArray(data) ? data[0] || null : data || null;
            return { ...lead, assignedClientDetails };
          } catch (contactError) {
            console.error("Unable to load assigned client contact details:", contactError?.message || contactError);
            return { ...lead, assignedClientDetails: null };
          }
        }));
        setLeads(leadsWithClientDetails);

        const { data: projectsData } = await supabase.from("designer_projects").select(`*, project_images (id, image_url, is_cover, room_category)`).eq("designer_id", designerData.id).order("created_at", { ascending: false });
        setProjects(projectsData || []);
      } catch {
        toast.error("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, adminDesignerId, profileOnly]);

  const handleInitiateRazorpayCheckout = async (tierInput = "subscription") => {
    if (!designer?.is_verified) {
      toast.error("Payment is available after your professional profile is verified.");
      return;
    }
    const tier = (tierInput === "new" || tierInput === "renew") ? "subscription" : tierInput;
    const toastId = toast.loading("Initializing payment...");

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { tier, designer_id: designer?.id },
      });

      if (orderError || !orderData?.id) {
        throw new Error(orderError?.message || orderData?.error || "Failed to create order");
      }

      toast.dismiss(toastId);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Vishvakarmans",
        description: tier === "subscription" ? "Partner Subscription" : "Featured Designer Boost",
        order_id: orderData.id,
        handler: async (response) => {
          const verifyToastId = toast.loading("Verifying payment...");
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  tier,
                  designer_id: designer?.id,
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || verifyData?.error || "Payment verification failed");
            }

            toast.success("Payment Successful!", { id: verifyToastId });

            if (tier === "subscription") {
              setDesigner((prev) => ({
                ...prev,
                is_subscription_active: true,
                subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              }));
            } else if (tier.startsWith("featured_")) {
              let days = 30;
              if (tier === "featured_90") days = 90;
              if (tier === "featured_365") days = 365;
              setDesigner((prev) => ({
                ...prev,
                featured_status: "featured",
                featured_expiry: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
              }));
            }
          } catch (err) {
            toast.error(err.message || "Payment verification failed", { id: verifyToastId });
          }
        },
        prefill: {
          name: designer?.name || "",
          email: designer?.email || "",
          contact: designer?.phone || "",
        },
        theme: {
          color: "#ea580c",
        },
        modal: {
          ondismiss: () => toast("Payment was dismissed. You can use Pay Now from Billing & Marketing whenever you're ready."),
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.error("Razorpay SDK failed to load. Please refresh the page.");
      }
    } catch (err) {
      toast.error(err.message || "Could not start checkout", { id: toastId });
    }
  };

  useEffect(() => {
    window.initiateRazorpayCheckout = handleInitiateRazorpayCheckout;
    return () => {
      delete window.initiateRazorpayCheckout;
    };
  }, [designer]);

  // Keep the current dashboard in sync when an administrator verifies this
  // profile in another session. Verification updates the existing row, so no
  // second payment system or database field is required.
  useEffect(() => {
    if (!designer?.id || adminDesignerId) return undefined;

    let isMounted = true;
    const refreshPaymentEligibility = async () => {
      const { data, error } = await supabase
        .from("designers")
        .select("id, is_verified, is_subscription_active, subscription_end, is_public")
        .eq("id", designer.id)
        .maybeSingle();

      if (error) {
        console.error("Unable to refresh designer payment status:", error);
        return;
      }
      if (!isMounted || !data) return;

      // The route guards observe the joined profile at ["users", userId],
      // while this dashboard keeps its own designer row for its controls.
      // Keep both snapshots aligned when verification changes in the admin
      // application so the guard and dashboard cannot disagree mid-session.
      queryClient.setQueryData(["users", designer.user_id], (profile) => {
        if (!profile?.designer || profile.designer.id !== data.id) return profile;
        return { ...profile, designer: { ...profile.designer, ...data } };
      });

      setDesigner((current) => {
        if (!current || current.id !== data.id) return current;
        if (
          current.is_verified === data.is_verified &&
          current.is_subscription_active === data.is_subscription_active &&
          current.subscription_end === data.subscription_end &&
          current.is_public === data.is_public
        ) {
          return current;
        }
        return { ...current, ...data };
      });

      // Refresh the complete joined profile after publishing the updated
      // subset above. This also reconciles any other profile fields changed
      // during the same admin action without blocking the visible dashboard.
      void queryClient.invalidateQueries({
        queryKey: ["users", designer.user_id],
        exact: true,
      }).catch((refreshError) => {
        console.error("Unable to refresh designer account state:", refreshError);
      });
    };

    const intervalId = window.setInterval(refreshPaymentEligibility, 5000);
    window.addEventListener("focus", refreshPaymentEligibility);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshPaymentEligibility);
    };
  }, [designer?.id, designer?.user_id, adminDesignerId, queryClient]);

  // Open the existing Razorpay checkout once when the admin verification
  const handleRequestRenewal = async () => {
    try {
      await supabase.from("designers").update({ renewal_requested: true }).eq("id", designer.id);
      setDesigner({ ...designer, renewal_requested: true });
      toast.success("Renewal request sent to Admin!");
    } catch {
      toast.error("Failed to send request.");
    }
  };

  const handleRequestFeature = async () => {
    let featDaysLeft = 0;
    if (designer.featured_expiry) {
      const diff = new Date(designer.featured_expiry) - new Date();
      featDaysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    if (designer.featured_status === "featured" && featDaysLeft > 5) return toast.success("You are already featured!");
    if (designer.featured_status === "requested") return toast.success("Request already sent.");
    try {
      await supabase.from("designers").update({ featured_status: "requested" }).eq("id", designer.id);
      setDesigner({ ...designer, featured_status: "requested" });
      toast.success("Request sent to Admin! We will contact you soon.");
    } catch {
      toast.error("Request failed");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const normalizedAbout = profileForm.about_text.trim();
    const projectsCompleted = Number(profileForm.projects_completed);
    if (profileOnly && (!normalizedAbout || !Number.isInteger(projectsCompleted) || projectsCompleted < 0)) {
      toast.error("Enter a valid completed-project count and an About description before submitting.");
      return;
    }
    setUploading(true);
    try {
      let finalUrl = profileForm.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logos/${designer.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("portfolio").upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        finalUrl = supabase.storage.from("portfolio").getPublicUrl(fileName).data.publicUrl;
      }
      const updatePayload = {
        name: profileForm.name, city: profileForm.city, projects_completed: parseInt(profileForm.projects_completed) || 0, about_text: profileOnly ? normalizedAbout : profileForm.about_text,
        experience_years: parseInt(profileForm.experience_years) || 0, video_link: profileForm.video_link,
        video_link_2: profileForm.video_link_2, designer_type: profileForm.designer_type,
        phone: profileForm.phone, email: profileForm.email, style_tags: profileForm.style_tags, logo_url: finalUrl,
        is_public: isExpired ? false : profileForm.is_public // Automatically lock to false if expired
      };
      const { error: updateError } = await supabase.from("designers").update(updatePayload).eq("id", designer.id);
      if (updateError) throw updateError;
      const updatedDesigner = { ...designer, ...updatePayload };
      setDesigner(updatedDesigner);
      setIsProfileIncomplete(!isProfessionalProfileComplete(updatedDesigner));
      if (profileOnly) {
        queryClient.setQueryData(["users", user.id], (currentProfile) => ({
          ...(currentProfile || {}),
          role: currentProfile?.role || "designer",
          designer: updatedDesigner,
        }));
        toast.success("Professional profile submitted for admin review.");
        navigate("/dashboard", { replace: true });
      } else {
        toast.success("Profile Updated!");
      }
    } catch (err) {
      toast.error("Save failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      if (status === "delete") {
        const { error } = await supabase.from("connections").delete().eq("id", id);
        if (error) throw error;
        setLeads(prev => prev.filter(l => l.id !== id));
        toast.success("Connection permanently deleted.");
      } else {
        const timestamp = new Date().toISOString();
        const { error } = await supabase.from("connections").update({ status, updated_at: timestamp }).eq("id", id);
        if (error) throw error;
        setLeads(prev => {
          const updated = prev.map(l => l.id === id ? { ...l, status, updated_at: timestamp } : l);
          return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        });
        toast.success(`Moved to ${status === 'accepted' ? 'Active' : 'On Hold'}`);
      }
    } catch (error) {
      console.error("Failed to update inquiry status:", error);
      toast.error("Failed to update status.");
    }
  };

  const addTag = () => {
    if (newTag && !profileForm.style_tags.includes(newTag)) {
      setProfileForm({ ...profileForm, style_tags: [...profileForm.style_tags, newTag] });
      setNewTag("");
    }
  };
  const removeTag = (tag) => setProfileForm({ ...profileForm, style_tags: profileForm.style_tags.filter((t) => t !== tag) });
  const handleTagKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } };

  const handleDeleteProject = async (id) => {
    if (window.confirm("Delete this project permanently?")) {
      await supabase.from("designer_projects").delete().eq("id", id);
      setProjects(projects.filter((p) => p.id !== id));
      toast.success("Deleted");
    }
  };
  
  const handleLogout = async () => { 
    try {
      await signOut(); 
      queryClient.clear();
      localStorage.clear(); 
      navigate("/login"); 
    } catch {
      // fallback
    }
  };

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    const currentUserId = user?.id || designer?.user_id;
    if (!currentUserId) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const { error } = await supabase
            .from("users")
            .update({ location: `POINT(${longitude} ${latitude})` })
            .eq("id", currentUserId);

          if (error) throw error;
          setHasLocation(true);
          toast.success("Service area location updated successfully!");
        } catch (err) {
          toast.error("Failed to update location: " + (err.message || "Unknown error"));
        } finally {
          setUpdatingLocation(false);
        }
      },
      (geoError) => {
        setUpdatingLocation(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access in your browser settings.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          toast.error("Location information is unavailable. Please try again.");
        } else if (geoError.code === geoError.TIMEOUT) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Could not capture location: " + (geoError.message || "Unknown error"));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const renderProfileForm = () => (
    <form onSubmit={handleUpdateProfile} className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
      <div className="flex flex-col items-center gap-4 border-b border-gray-200 pb-6">
        <div className="w-24 h-24 rounded-full bg-gray-50 border-2 border-gray-300 overflow-hidden relative">
          {logoFile ? <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" /> : <img src={designer?.logo_url} className="w-full h-full object-cover" />}
        </div>
        <div>
          <input type="file" onChange={(e) => setLogoFile(e.target.files[0])} className="hidden" id="logoUpload" />
          <label htmlFor="logoUpload" className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">Change Logo</label>
        </div>
      </div>
      
      {/* --- NEW VISIBILITY TOGGLE --- */}
      <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Globe size={16} className="text-blue-500"/> Profile Visibility
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {isExpired 
              ? "Your subscription has expired. Your profile is automatically set to Private until renewed."
              : "When Public, clients can discover and view your profile in the directory."}
          </p>
        </div>
        <select 
          className="bg-white border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-900 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          value={isExpired ? "private" : (profileForm.is_public ? "public" : "private")}
          disabled={isExpired}
          onChange={(e) => setProfileForm({ ...profileForm, is_public: e.target.value === "public" })}
        >
          <option value="public">Public (Visible)</option>
          <option value="private">Private (Hidden)</option>
        </select>
      </div>

      {/* --- SERVICE AREA LOCATION --- */}
      <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={16} className="text-emerald-600" /> Set My Service Area
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {hasLocation
              ? "Your service location is set. Homeowners in your service area can connect with you."
              : "Capture your GPS coordinates to allow clients in your service region to discover you."}
          </p>
        </div>
        <button
          type="button"
          disabled={updatingLocation}
          onClick={handleUpdateLocation}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm shrink-0"
        >
          {updatingLocation ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MapPin size={16} />
          )}
          {updatingLocation
            ? "Updating..."
            : hasLocation
            ? "Update Location"
            : "Set My Service Area"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-200/50">
        <div className="opacity-70"><label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Mail size={10} /> Email <Lock size={10} /></label><p className="text-gray-900 font-mono text-sm truncate">{profileForm.email}</p></div>
        <div className="opacity-70"><label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Phone size={10} /> Phone <Lock size={10} /></label><p className="text-gray-900 font-mono text-sm">{profileForm.phone}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs font-bold text-gray-500 uppercase">Brand Name</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">City</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.city} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs font-bold text-gray-500 uppercase">Experience (Years)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.experience_years} onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })} /></div>
        <div><label className="text-xs font-bold text-gray-500 uppercase">Type</label><select className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.designer_type} onChange={(e) => setProfileForm({ ...profileForm, designer_type: e.target.value })}><option value="interior">Interior</option><option value="commercial">Commercial</option><option value="both">Both</option></select></div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Specialties</label>
        <div className="flex gap-2 mt-1 mb-2">
          <input type="text" placeholder="Add Tag (Press Enter)..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={handleTagKeyDown} />
          <button type="button" onClick={addTag} className="bg-gray-100 px-4 rounded-xl text-gray-900 font-bold">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(profileForm.style_tags || []).map((tag) => <span key={tag} className="bg-gray-100 px-2 py-1 rounded text-xs flex items-center gap-1">{tag} <button type="button" onClick={() => removeTag(tag)}><XCircle size={12} /></button></span>)}
        </div>
      </div>
      <div><label className="text-xs font-bold text-gray-500 uppercase">Total Projects Completed</label><input type="number" min="0" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.projects_completed} onChange={(e) => setProfileForm({ ...profileForm, projects_completed: e.target.value })} /></div>
      <div><label htmlFor="designer-about-text" className="text-xs font-bold text-gray-500 uppercase">About</label><textarea id="designer-about-text" rows="4" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 mt-1" value={profileForm.about_text} onChange={(e) => setProfileForm({ ...profileForm, about_text: e.target.value })} /></div>
      <div className="space-y-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Video size={14} /> Video Intros (Optional)</label>
        <input type="url" placeholder="Video Link 1 (Youtube/Vimeo)" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" value={profileForm.video_link} onChange={(e) => setProfileForm({ ...profileForm, video_link: e.target.value })} />
        <input type="url" placeholder="Video Link 2 (Youtube/Vimeo)" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900" value={profileForm.video_link_2} onChange={(e) => setProfileForm({ ...profileForm, video_link_2: e.target.value })} />
      </div>
      <button type="submit" disabled={uploading} className="w-full bg-brand-accent hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 shadow-lg">{uploading ? <Loader2 className="animate-spin mx-auto" /> : profileOnly ? "Submit profile for review" : "Save Changes"}</button>
    </form>
  );

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-900"><Loader2 className="animate-spin text-brand-accent" size={40} /></div>;
  if (profileOnly) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
            {isProfileIncomplete ? "Complete Your Professional Profile" : "Review Your Professional Profile"}
          </h1>
          {!isProfileIncomplete && (
            <p className="text-sm text-gray-600 text-center mb-6">
              Your submitted details are awaiting admin approval. You can update them here while they are under review.
            </p>
          )}
          {renderProfileForm()}
        </div>
      </div>
    );
  }
  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-900 overflow-hidden relative transition-all duration-300">
        {adminDesignerId && (
          <div className="absolute top-0 left-0 w-full bg-blue-600 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-2 z-[100] shadow-md">
            <ShieldAlert size={14} /> ADMIN OVERRIDE MODE: You are managing {designer?.name}'s profile.
            <button onClick={() => navigate("/admin")} className="ml-4 underline hover:text-blue-200">Exit to Admin Panel</button>
          </div>
        )}

        <nav className={`md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 flex justify-around p-3 safe-area-bottom shadow-2xl ${adminDesignerId ? 'pb-8' : ''}`}>
          <button onClick={() => setActiveTab("leads")} className={`flex flex-col items-center gap-1 ${activeTab === "leads" ? "text-brand-accent" : "text-gray-500"}`}><Users size={20} /><span className="text-[10px]">Leads</span></button>
          <button onClick={() => setActiveTab("projects")} className={`flex flex-col items-center gap-1 ${activeTab === "projects" ? "text-brand-accent" : "text-gray-500"}`}><ImageIcon size={20} /><span className="text-[10px]">Work</span></button>
          <button onClick={() => setActiveTab("billing")} className={`flex flex-col items-center gap-1 ${activeTab === "billing" ? "text-brand-accent" : "text-gray-500"}`}><CreditCard size={20} /><span className="text-[10px]">Billing</span></button>
          <button onClick={() => setActiveTab("settings")} className={`flex flex-col items-center gap-1 ${activeTab === "settings" ? "text-brand-accent" : "text-gray-500"}`}><Settings size={20} /><span className="text-[10px]">Profile</span></button>
        </nav>
        
        <div className={`md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-40 p-4 flex justify-between items-center ${adminDesignerId ? 'mt-8' : ''}`}>
          <div className="flex items-center gap-2 text-brand-accent font-bold text-lg"><Briefcase size={20} /> Designer Dashboard</div>
          <button onClick={handleLogout} className="bg-red-50 text-red-500 p-2 rounded-lg border border-red-100"><LogOut size={18} /></button>
        </div>

        <aside className={`hidden md:flex w-72 bg-white border-r border-gray-200 flex-col p-6 sticky top-0 h-screen overflow-y-auto ${adminDesignerId ? 'pt-12' : ''}`}>
          <div className="mb-6 w-full flex flex-col items-center justify-center">
            <img src="/logo.png" alt="Vishwakarmans Logo" className="h-8 md:h-10 w-auto object-contain" />
          </div>
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 border-2 border-gray-200 overflow-hidden shadow-sm">
              {designer?.logo_url ? <img src={designer.logo_url} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center font-bold text-3xl text-gray-400">{designer?.name?.[0]}</div>}
            </div>
            <h2 className="text-gray-900 font-bold text-lg truncate w-full">{designer?.name}</h2>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded mt-2">Verified Partner</span>
          </div>
          <div className="space-y-2 flex-1">
            <button onClick={() => setActiveTab("leads")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "leads" ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}><Users size={20} /> Inquiries</button>
            <button onClick={() => setActiveTab("projects")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "projects" ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}><ImageIcon size={20} /> Portfolio</button>
            <button onClick={() => setActiveTab("billing")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "billing" ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}><CreditCard size={20} /> Billing & Marketing</button>
            <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === "settings" ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-100"}`}><Settings size={20} /> Edit Profile</button>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 mt-auto border border-transparent hover:border-red-200 transition-colors"><LogOut size={20} /> Sign Out</button>
        </aside>
        
        <main className={`flex-1 p-4 md:p-8 mt-16 md:mt-0 mb-20 md:mb-0 overflow-y-auto h-[calc(100vh-140px)] md:h-screen ${adminDesignerId ? 'md:pt-16' : ''}`}>
          
          {/* --- 7-DAY EXPIRY WARNING BANNER --- */}
          {showWarningBanner && (
            <div className="max-w-6xl mx-auto mb-6 bg-amber-50 border border-amber-200/80 text-amber-900 px-5 py-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all animate-in fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                <p className="text-sm font-medium leading-relaxed">
                  Your access expires in <span className="font-bold">{daysLeft} {daysLeft === 1 ? "day" : "days"}</span>. Renew to maintain portfolio visibility and access to client leads.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("billing")}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shrink-0 uppercase tracking-wider active:scale-95"
              >
                Renew Now
              </button>
            </div>
          )}
          {activeTab === "leads" && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* --- TOP STATISTICS CARDS (Real Supabase Data) --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Inquiries</p>
                  <p className="text-2xl font-extrabold text-gray-900">{leads?.length || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Projects</p>
                  <p className="text-2xl font-extrabold text-emerald-600">{projects?.length || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Profile Views</p>
                  <p className="text-2xl font-extrabold text-brand-accent">{designer?.profile_views || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Account Status</p>
                  <p className="text-2xl font-extrabold text-emerald-600 capitalize">{designer?.status || "Active"}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Users className="text-brand-accent" /> Inquiries & Clients
                </h1>
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                  {['pending', 'accepted', 'on_hold'].map(statusType => (
                    <button
                      key={statusType}
                      onClick={() => setLeadFilter(statusType)}
                      className={`px-4 py-2 rounded-md text-sm font-bold capitalize whitespace-nowrap transition-colors ${
                        leadFilter === statusType 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      {statusType === 'pending' ? 'New Requests' : 
                       statusType === 'accepted' ? 'Active Clients' : 'On Hold'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {leads.filter((l) => l.status === leadFilter).length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 border-dashed rounded-3xl p-8 md:p-12 text-center text-gray-500">
                    <AlertCircle className="mx-auto mb-3 text-gray-400" size={40} />
                    <p className="text-lg font-medium text-gray-600">No {leadFilter === "pending" ? "new requests" : leadFilter === "accepted" ? "active clients" : "clients on hold"}.</p>
                  </div>
                ) : (
                  leads.filter((l) => l.status === leadFilter).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onStatusUpdate={handleStatusUpdate} />
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === "projects" && (
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3"><Briefcase className="text-brand-accent" /> Portfolio</h1>
                <button onClick={() => setShowAddProjectModal(true)} className="bg-gray-900 hover:bg-brand-accent text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 w-full md:w-auto justify-center transition-colors shadow-lg"><Plus size={20} /> Add Project</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                  <div className="col-span-full border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-white">
                    <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="text-brand-accent" size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your portfolio is empty</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">Upload your first project to start getting noticed by homeowners.</p>
                    <button onClick={() => setShowAddProjectModal(true)} className="bg-brand-accent hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-colors shadow-lg"><Plus size={18} /> Add Your First Project</button>
                  </div>
                ) : (
                  projects.map((proj) => <ProjectCard key={proj.id} proj={proj} onDelete={handleDeleteProject} onEdit={setEditingProject} />)
                )}
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <BillingTab
              designer={designer}
              onRequestRenewal={handleRequestRenewal}
              onRequestFeature={handleRequestFeature}
              onCheckout={handleInitiateRazorpayCheckout}
            />
          )}
          
          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto pb-10">
              {designer?.is_verified === false && isProfessionalProfileComplete(designer) && (
                <ProfessionalProfileReviewStatus />
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3"><Settings className="text-brand-accent" /> Profile Settings</h1>
              {renderProfileForm()}
            </div>
          )}
        </main>
      </div>

      {showActivationPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="activation-prompt-title"
            className="relative w-full max-w-md space-y-6 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close activation prompt"
              onClick={() => setPaymentPromptDismissed(true)}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <X size={18} />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-inner">
              <Sparkles size={32} />
            </div>
            <div>
              <h2 id="activation-prompt-title" className="text-2xl font-bold text-gray-900">
                Activate Your Account
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Your application has been approved! Complete your subscription payment to unlock your workspace and start receiving leads.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => window.initiateRazorpayCheckout?.("new")}
                className="w-full rounded-xl bg-gray-900 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-black active:scale-95"
              >
                Pay &amp; Activate Account
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </section>
        </div>
      )}

      {showAddProjectModal && <AddProjectModal designerId={designer?.id} onClose={() => setShowAddProjectModal(false)} onAdd={(newProj) => setProjects([newProj, ...projects])} />}
      {editingProject && <EditProjectModal project={editingProject} designerId={designer?.id} onClose={() => setEditingProject(null)} onUpdate={(id, updates) => setProjects(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)))} />}
    </div>
  );
};

export default DesignerDashboard;
