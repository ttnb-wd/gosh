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
    <section className="py-16 lg:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-yellow-600 mb-4">
            Premium Ingredients
          </p>
          <h2 className="text-4xl font-black text-black sm:text-5xl">
            Crafted with Excellence
          </h2>
          <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
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
              <div className="relative h-full overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg transition-all duration-500 hover:shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 via-yellow-400/0 to-yellow-400/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
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
                  
                  <h3 className="text-xl font-bold text-black mb-2">{ingredient.name}</h3>
                  <p className="text-sm text-zinc-600">{ingredient.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
