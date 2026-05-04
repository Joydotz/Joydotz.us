import { Link } from 'react-router-dom'

const HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMqnlA1yJBjcR8XqBNKREOON-7KjQhrwpSRp4oXpmtHbui30b1cPrUQ8-nGooxW9z7Zsy4gTUgI6WUxjmGFRMhslmlGUafysvh_zqDjl76SYV-RjaJy_VLFCgFqBpKqkCu6v7UCI_5YDdga444nd_96zmhqbNCyZebKIU5SeNPbU2cOx6NuZJ64V_o_aun4IU3K_mxDYQRJOK_YjvM5YED-NErwZBZXyVMnxIA430J9_KMgTSIOdVVmnYC35bwtzqaQj-NY5P2p3E'
const CLOUD_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8xZHWL_rcw7lgxpuTaolnZjGxZ9depQBoPnezOn591Enc7h3e90ujvvi_nmYyZmhd6iRcXrBr0phTc6UiB9vss1Ts8TOhY9apcVuY9JRAz8Mdhc1kOdOjpKKbMEn4dWKqHCnYLQ91FenYuy1trZ8bJJJp1gU5NEYPR5rS1A9lUh_hQ78VgoniFEuxawK5JkDkRgwisaYhq1cK2Id8XYGyQg0Qe-rKLrNoaOD0tdHobg9iN_kNU5Zg7PoIFSDlzW9k5OLNw-DissQ'
const BUTTERFLY_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMIJmpo15V6oP8s92l67Gsh900WsZXwvVnMAlqSmKdatf1g0vLxuPphwrD55wUm-OuamVblpbXSsR2hmZrY0s3Z59DbwFdDXTKUuf97gf6pYqx3l3S1oKPA0m5ynUKmnPqt-h9gCGbh9IJY2Yu1MksW_092k-lEh9HxsG4VuQYr5pwZwuXOjWYkMi2P_1wvtNQhsSfweSXD3e6ziQUThCu91lA9KsqchSH2rXXkaARxIPpXbNN-Bjaxtu0Z4SrK8qAnipWyy5XIIE'

export default function Hero() {
  return (
    <section className="relative min-h-[921px] flex items-center overflow-hidden px-8">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-[10%] w-64 h-64 bg-primary-container/20 rounded-full blur-[80px] -z-10" />
      <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-secondary-container/20 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-16 items-center">
        {/* Left column */}
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">
              A New Phase of Care
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-on-surface leading-[0.9] tracking-tighter font-headline">
            The skin has{' '}
            <span className="text-primary italic">phases</span>, but joy remains.
          </h1>

          <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed font-body">
            Curating comfort for your daily ritual. Discover collectible skincare that
            treats your skin with the gentleness of a soft cloud.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="px-10 py-5 bg-primary text-on-primary rounded-full font-bold text-lg shadow-[0_20px_40px_rgba(126,85,70,0.15)] hover:scale-105 hover:shadow-[0_25px_50px_rgba(126,85,70,0.25)] transition-all active:scale-95 border border-primary-fixed-dim/20"
            >
              Shop the Collection
            </Link>
            <Link
              to="/about"
              className="px-10 py-5 bg-surface-container-lowest text-on-surface rounded-full font-bold text-lg hover:bg-surface-container transition-all active:scale-95"
            >
              Our Story
            </Link>
          </div>
        </div>

        {/* Right column — images */}
        <div className="relative flex justify-center items-center h-[600px]">
          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
            <img
              className="w-full h-full object-cover"
              alt="Dreamy artistic close-up of soft pink and peach skincare textures"
              src={HERO_IMG}
            />
          </div>

          {/* Cloud sticker */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-surface-container-lowest p-4 rounded-xl shadow-xl -rotate-12 hover:scale-110 transition-transform">
            <img
              className="w-full h-full object-cover rounded-lg"
              alt="A small white cloud-shaped ceramic container on soft silk"
              src={CLOUD_IMG}
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
              Cloud SKU
            </div>
          </div>

          {/* Butterfly sticker */}
          <div className="absolute -bottom-12 right-0 w-48 h-48 bg-surface-container-lowest p-4 rounded-xl shadow-xl rotate-6 hover:scale-110 transition-transform">
            <img
              className="w-full h-full object-cover rounded-lg"
              alt="Macro photography of a delicate butterfly resting on a soft pastel petal"
              src={BUTTERFLY_IMG}
            />
            <div className="absolute -top-2 -left-2 bg-secondary text-on-secondary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
              Butterfly Phase
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
