import {useEffect,useState} from "react";
import {BookOpen,Edit3,Plus,Search,Trash2,X} from "lucide-react";
import {
  createKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
  getKnowledgeBaseArticles,
  searchKnowledgeBase,
  updateKnowledgeBaseArticle,
  type KnowledgeBaseArticle,
  type KnowledgeBaseArticleInput,
  type KnowledgeBaseCategory,
} from "../services/api.js";

const CATEGORIES:{value:KnowledgeBaseCategory;label:string}[]=[
  {value:"faq",label:"FAQ"},
  {value:"product",label:"Product"},
  {value:"billing",label:"Billing"},
  {value:"refund",label:"Refund"},
  {value:"cancellation",label:"Cancellation"},
  {value:"shipping",label:"Shipping"},
  {value:"account",label:"Account"},
  {value:"technical",label:"Technical"},
  {value:"policy",label:"Policy"},
  {value:"general",label:"General"},
];

const EMPTY_FORM:KnowledgeBaseArticleInput={
  title:"",
  content:"",
  category:"general",
  tags:[],
  active:true,
};

export default function KnowledgeBase(){
  const [articles,setArticles]=useState<KnowledgeBaseArticle[]>([]);
  const [form,setForm]=useState<KnowledgeBaseArticleInput>(EMPTY_FORM);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const [error,setError]=useState("");

  async function loadArticles(){
    try{
      setLoading(true);
      setError("");
      const data=search.trim()
        ?await searchKnowledgeBase(search.trim())
        :await getKnowledgeBaseArticles();
      setArticles(data);
    }catch(err){
      setError(err instanceof Error?err.message:"Failed to load knowledge base.");
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    const timeout=window.setTimeout(()=>{
      void loadArticles();
    },300);
    return ()=>window.clearTimeout(timeout);
  },[search]);

  function resetForm(){
    setForm({...EMPTY_FORM,tags:[]});
    setEditingId(null);
  }

  function startEditing(article:KnowledgeBaseArticle){
    setEditingId(article._id);
    setForm({
      title:article.title,
      content:article.content,
      category:article.category,
      tags:article.tags,
      active:article.active,
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function updateField<K extends keyof KnowledgeBaseArticleInput>(
    field:K,
    value:KnowledgeBaseArticleInput[K],
  ){
    setForm((current)=>({...current,[field]:value}));
  }

  async function handleSubmit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();

    if(!form.title.trim()||!form.content.trim()){
      setError("Title and content are required.");
      return;
    }

    try{
      setSaving(true);
      setError("");

      const payload:KnowledgeBaseArticleInput={
        title:form.title.trim(),
        content:form.content.trim(),
        category:form.category,
        tags:form.tags??[],
        active:form.active??true,
      };

      if(editingId){
        await updateKnowledgeBaseArticle(editingId,payload);
      }else{
        await createKnowledgeBaseArticle(payload);
      }

      resetForm();
      await loadArticles();
    }catch(err){
      setError(err instanceof Error?err.message:"Failed to save knowledge base article.");
    }finally{
      setSaving(false);
    }
  }

  async function handleDelete(id:string){
    if(!window.confirm("Delete this knowledge base article?"))return;

    try{
      setDeletingId(id);
      setError("");
      await deleteKnowledgeBaseArticle(id);

      if(editingId===id)resetForm();

      await loadArticles();
    }catch(err){
      setError(err instanceof Error?err.message:"Failed to delete knowledge base article.");
    }finally{
      setDeletingId(null);
    }
  }

  async function handleToggleActive(article:KnowledgeBaseArticle){
    try{
      setError("");

      await updateKnowledgeBaseArticle(article._id,{
        title:article.title,
        content:article.content,
        category:article.category,
        tags:article.tags,
        active:!article.active,
      });

      await loadArticles();
    }catch(err){
      setError(err instanceof Error?err.message:"Failed to update article status.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">
          Knowledge Base
        </h1>
        <p className="mt-2 text-(--text-secondary)">
          Manage company information used by the AI customer-support assistant.
        </p>
      </div>

      {error&&(
        <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-4 text-(--danger-text)">
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={()=>setError("")}
              className="rounded-lg p-1 transition hover:bg-(--bg-secondary)"
              aria-label="Dismiss error"
            >
              <X size={16}/>
            </button>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-(--text-h)">
              {editingId?"Edit Article":"Create Article"}
            </h2>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Add company information the AI can use when answering customers.
            </p>
          </div>

          {editingId&&(
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-2 rounded-lg border border-(--border) px-3 py-2 text-sm text-(--text-h) transition hover:bg-(--bg-secondary)"
            >
              <X size={16}/>
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-(--text-h)">
              Title
            </label>
            <input
              value={form.title}
              onChange={(event)=>updateField("title",event.target.value)}
              placeholder="Refund Policy"
              className="w-full rounded-lg border border-(--border) bg-(--surface) px-4 py-3 text-(--text-h) outline-none transition placeholder:text-(--text-secondary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-(--text-h)">
              Content
            </label>
            <textarea
              value={form.content}
              onChange={(event)=>updateField("content",event.target.value)}
              placeholder="Customers can request a refund within 30 days of purchase..."
              rows={7}
              className="w-full resize-y rounded-lg border border-(--border) bg-(--surface) px-4 py-3 text-(--text-h) outline-none transition placeholder:text-(--text-secondary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-(--text-h)">
                Category
              </label>
              <select
                value={form.category}
                onChange={(event)=>updateField("category",event.target.value as KnowledgeBaseCategory)}
                className="w-full rounded-lg border border-(--border) bg-(--surface) px-4 py-3 text-(--text-h) outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
              >
                {CATEGORIES.map((category)=>(
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-(--text-h)">
                Tags
              </label>
              <input
                value={(form.tags??[]).join(", ")}
                onChange={(event)=>updateField(
                  "tags",
                  event.target.value.split(",").map((tag)=>tag.trim()).filter(Boolean),
                )}
                placeholder="refund, returns, money back"
                className="w-full rounded-lg border border-(--border) bg-(--surface) px-4 py-3 text-(--text-h) outline-none transition placeholder:text-(--text-secondary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-(--text-h)">
            <input
              type="checkbox"
              checked={form.active??true}
              onChange={(event)=>updateField("active",event.target.checked)}
              className="h-4 w-4 rounded border-(--border) accent-(--accent)"
            />
            Active article
          </label>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-(--accent) px-5 py-3 text-sm font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editingId?<Edit3 size={17}/>:<Plus size={17}/>}
            {saving?"Saving...":editingId?"Update Article":"Create Article"}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-(--text-h)">
              Articles
            </h2>
            <p className="mt-1 text-sm text-(--text-secondary)">
              {articles.length} article{articles.length===1?"":"s"}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)"
            />
            <input
              value={search}
              onChange={(event)=>setSearch(event.target.value)}
              placeholder="Search knowledge base..."
              className="w-full rounded-lg border border-(--border) bg-(--surface) py-3 pl-10 pr-4 text-sm text-(--text-h) outline-none transition placeholder:text-(--text-secondary) focus:border-(--accent) focus:ring-2 focus:ring-(--accent)/20"
            />
          </div>
        </div>

        {loading?(
          <div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-sm text-(--text-secondary) shadow-sm">
            Loading knowledge base...
          </div>
        ):articles.length===0?(
          <div className="rounded-xl border border-(--border) bg-(--surface) p-10 text-center shadow-sm">
            <BookOpen
              size={30}
              className="mx-auto mb-3 text-(--text-secondary)"
            />
            <h3 className="font-semibold text-(--text-h)">
              No articles found
            </h3>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Create your first knowledge base article above.
            </p>
          </div>
        ):(
          <div className="space-y-4">
            {articles.map((article)=>(
              <article
                key={article._id}
                className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-(--text-h)">
                        {article.title}
                      </h3>

                      <span className="rounded-full bg-(--bg-secondary) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
                        {article.category}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          article.active
                            ?"bg-(--success-bg) text-(--success-text)"
                            :"bg-(--bg-secondary) text-(--text-secondary)"
                        }`}
                      >
                        {article.active?"Active":"Inactive"}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-(--text-secondary)">
                      {article.content}
                    </p>

                    {article.tags.length>0&&(
                      <div className="mt-4 flex flex-wrap gap-2">
                        {article.tags.map((tag)=>(
                          <span
                            key={tag}
                            className="rounded-md border border-(--border) bg-(--bg-secondary) px-2 py-1 text-xs text-(--text-secondary)"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={()=>startEditing(article)}
                      className="flex items-center gap-2 rounded-lg border border-(--border) px-3 py-2 text-sm text-(--text-h) transition hover:bg-(--bg-secondary)"
                    >
                      <Edit3 size={15}/>
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={()=>void handleToggleActive(article)}
                      className="rounded-lg border border-(--border) px-3 py-2 text-sm text-(--text-h) transition hover:bg-(--bg-secondary)"
                    >
                      {article.active?"Deactivate":"Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={()=>void handleDelete(article._id)}
                      disabled={deletingId===article._id}
                      className="flex items-center gap-2 rounded-lg border border-(--danger-text) px-3 py-2 text-sm text-(--danger-text) transition hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={15}/>
                      {deletingId===article._id?"Deleting...":"Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
