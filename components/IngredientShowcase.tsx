"use client";

import { motion } from "framer-motion";

const fallbackIngredientImage =
  "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";

const ingredients = [
  {
    name: "Jasmine",
    description: "Delicate floral essence",
    image: "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?q=80&w=400&auto=format&fit=crop"
  },
  {
    name: "Sandalwood",
    description: "Warm woody base",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop"
  },
  {
    name: "Vanilla",
    description: "Sweet creamy notes",
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=400&auto=format&fit=crop"
  },
  {
    name: "Bergamot",
    description: "Fresh citrus top",
    image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=400&auto=format&fit=crop"
  }
];

const SHOW_INGREDIENT_SHOWCASE = false;

export default function IngredientShowcase() {
  if (!SHOW_INGREDIENT_SHOWCASE) {
    return null;
  }

  return (
    <section role="region" aria-label="Ingredient showcase" className="bg-[var(--site-bg)] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#6f1d1b]">
            Premium Ingredients
          </p>
          <h2 className="text-4xl font-black text-[#1f1a14] sm:text-5xl">
            Crafted with Excellence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#7a6a55]">
            Only the finest natural ingredients from around the world
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {ingredients.map((ingredient, index) => (
            <motion.div
              key={ingredient.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative w-full"
            >
              <div className="relative h-full overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-[#fbf6ed] p-6 shadow-lg transition-all duration-500 hover:border-[#6f1d1b]/25 hover:shadow-[0_18px_45px_rgba(212,175,55,0.14),0_6px_18px_rgba(111,29,27,0.08)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/0 via-[#d4af37]/0 to-[#f7e7b3]/35 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative">
                  <div className="mb-4 h-32 w-32 mx-auto overflow-hidden rounded-2xl">
                    <img
                      src={ingredient.image}
                      alt={ingredient.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        const image = e.currentTarget;
                        if (image.src !== fallbackIngredientImage) {
                          image.src = fallbackIngredientImage;
                        }
                      }}
                    />
                  </div>
                  
                  <h3 className="mb-2 text-xl font-bold text-[#1f1a14]">{ingredient.name}</h3>
                  <p className="text-sm text-[#7a6a55]">{ingredient.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
