import { Exercise } from '../types';

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'smith-bench-press',
    number: '01',
    name: '史密斯平板卧推',
    targetMuscle: '胸大肌中束',
    defaultSets: 4,
    repRange: '8–10',
    weight: 40,
    restSeconds: 90,
    previousNote: '上次 40kg 稳',
    recommendationTag: '上次 40kg 稳',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXAcQbz5j3Pl72JmosyfpKyOfnwiOiV6qAwufMMpEaaRrzkO3LVdKjF3__wahVykSAse3GpYRhIT8yfpK6VwMdN7_frSCd9mKbVvvrnRsvUi-bWWcVI9j5l3Z3XenNoNg9xopNN99ucNTJbOHJtNmG8bbpq2nYH_lNi0-oUQw-0PHuCM0zNdKBgADbp6W0fDjzazcv8huPBNoKyDQL2pwztTejAB-m0IEWFbzRt9dBpkwgDxuR3bkX0Q',
    instructions: {
      overview: '史密斯架平板卧推能够提供稳定的运动轨迹，使训练者专注于胸大肌中束的发力与离心对抗。',
      keyPoints: [
        '仰卧平躺于长凳，双脚踩实地面，肩胛骨后缩下沉并夹紧。',
        '双手略宽于肩握住杠铃杆，出杠后平稳下落至胸骨中下段。',
        '下降段保持 2 秒离心控制，背阔肌收紧保持稳定承托。',
        '推起时主要靠胸大肌收缩发力，肘关节微屈，避免骨骼硬锁定。'
      ],
      commonMistakes: [
        '耸肩或肩胛骨松懈，导致三角肌前束过度代偿。',
        '下落速度过快，借胸腔反弹力推起。',
        '手腕过度后伸，压迫腕关节韧带。'
      ],
      warmupAdvice: '建议使用空杆或20kg进行2组12-15次动态热身，激活胸肌并感受肩胛下沉。'
    },
    sets: [
      { setNumber: 1, weight: 40, reps: 8, targetReps: '8-10', isCompleted: true },
      { setNumber: 2, weight: 40, reps: 8, targetReps: '8-10', isCompleted: false, isCurrent: true },
      { setNumber: 3, weight: 40, reps: 8, targetReps: '8–10', isCompleted: false },
      { setNumber: 4, weight: 40, reps: 8, targetReps: '8–10', isCompleted: false },
    ]
  },
  {
    id: 'seated-cable-row',
    number: '02',
    name: '坐姿绳索划船',
    targetMuscle: '背阔肌/斜方肌',
    defaultSets: 4,
    repRange: '10–12',
    weight: 45,
    restSeconds: 90,
    previousNote: '推荐+2.5kg',
    recommendationTag: '推荐+2.5kg',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3O12FPq_cqnR4uHVNWQdn1J_ryPOAoB5LlThek_hfpAXwLQ7OhCdmPZMkPiQ6_xdpq_XpByt4pWkRZQnCy2BimuDtQvXjJ9_l2t4jcKs9sQINqkOCgaI_Im1mMrcbwKp3pJ12ITjHL1vkuvXpMc_9vedCVU1j2t2Tor-xEG9nopAb8zENtQkcyWy2gWN4iPl81QgSCVrN0kE9WqKxtsEIoLjuX1342y3hIyp8nIwkZWqOrREg58WOLw',
    instructions: {
      overview: '坐姿绳索划船是打造背部厚度与改善圆肩驼背的经典水平拉动作。',
      keyPoints: [
        '双脚蹬在踏板上，膝关节微屈，上身挺直挺胸，核心收紧。',
        '呼气发力时，先带动肩胛骨后缩，再屈肘将握把拉向腹部。',
        '肘部紧贴身体两侧，顶峰收缩停顿 1 秒。',
        '吸气缓慢放回，保持背阔肌张力，避免身体过度前倾借力。'
      ],
      commonMistakes: [
        '后仰幅度过大，利用下背甩动代偿。',
        '拉动时耸肩，导致上斜方肌酸痛。'
      ],
      warmupAdvice: '先做肩胛骨活动度拉伸，采用轻重量专注体会“肩胛带动手臂”的节奏。'
    },
    sets: [
      { setNumber: 1, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
      { setNumber: 2, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
      { setNumber: 3, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
      { setNumber: 4, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
    ]
  },
  {
    id: 'leg-press',
    number: '03',
    name: '腿举',
    targetMuscle: '股四头肌',
    defaultSets: 4,
    repRange: '10–12',
    weight: 120,
    restSeconds: 120,
    previousNote: '状态稳定',
    recommendationTag: '状态稳定',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALwYg8diGgZL7M9FAH-XcoD5mQWunkiTgIIUtk4ZdC5G6mFaq7nuzxhgmnugmaEfPv59vvS4WmXFFJsYnTtaD4cnQy1SssObOLU4aJhUHrPMecupkAAFeYF6WKaFRBb6UlYcu9VnMtys7shhq6uygG_px9la-du8ZtDqWxLRZTwhy7WTRRYEw8qZDums4JsdneklxIl_kAcnufBVh80uG6OxCbAMQEgKIlc2EaDTScE-Ey2XxswYGrlw',
    instructions: {
      overview: '倒蹬机腿举能在减轻腰椎压力的同时，对股四头肌和臀大肌进行大负荷超量恢复刺激。',
      keyPoints: [
        '背部和臀部完全贴紧靠垫，双手紧握两侧把手稳定身体。',
        '双脚与肩同宽踩在踏板中央，脚尖微向外展。',
        '下放踏板直至大腿与小腿夹角约为90度，臀部不得离开发垫。',
        '蹬起时脚跟均匀发力，膝盖切勿超伸硬锁。'
      ],
      commonMistakes: [
        '膝盖内扣，增加前交叉韧带剪切力。',
        '动作末端下背部弯曲离开靠垫，加重腰椎压力。'
      ],
      warmupAdvice: '以空载或50kg起步，测试踏板间距与脚位是否舒适。'
    },
    sets: [
      { setNumber: 1, weight: 120, reps: 12, targetReps: '10-12', isCompleted: false },
      { setNumber: 2, weight: 120, reps: 12, targetReps: '10-12', isCompleted: false },
      { setNumber: 3, weight: 120, reps: 12, targetReps: '10-12', isCompleted: false },
      { setNumber: 4, weight: 120, reps: 12, targetReps: '10-12', isCompleted: false },
    ]
  }
];

export const ALTERNATIVE_EXERCISES: Record<string, Omit<Exercise, 'number'>[]> = {
  'smith-bench-press': [
    {
      id: 'neutral-dumbbell-press',
      name: '中立握哑铃推胸',
      targetMuscle: '胸大肌中束',
      defaultSets: 4,
      repRange: '10–12',
      weight: 18,
      restSeconds: 90,
      previousNote: '护肩首选 · 对握角度更顺',
      recommendationTag: '护肩推荐',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXAcQbz5j3Pl72JmosyfpKyOfnwiOiV6qAwufMMpEaaRrzkO3LVdKjF3__wahVykSAse3GpYRhIT8yfpK6VwMdN7_frSCd9mKbVvvrnRsvUi-bWWcVI9j5l3Z3XenNoNg9xopNN99ucNTJbOHJtNmG8bbpq2nYH_lNi0-oUQw-0PHuCM0zNdKBgADbp6W0fDjzazcv8huPBNoKyDQL2pwztTejAB-m0IEWFbzRt9dBpkwgDxuR3bkX0Q',
      instructions: {
        overview: '采用掌心相对的中立握法，显著减轻肩峰撞击与三角肌前束压力，非常适合肩部轻微不适时的安全强化。',
        keyPoints: [
          '双手握哑铃坐于凳端，后倒靠实长凳，肩胛骨后缩下沉。',
          '掌心相对（或呈45度），肘部与躯干夹角约为45–60度。',
          '推起至顶峰时胸肌收紧，手肘微屈不硬锁。'
        ],
        commonMistakes: ['肘部过度外展超过75度', '下落过深拉扯肩袖'],
        warmupAdvice: '先用单只10kg哑铃做10次空程试探肩膀感受。'
      },
      sets: [
        { setNumber: 1, weight: 18, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 2, weight: 18, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 3, weight: 18, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 4, weight: 18, reps: 10, targetReps: '10-12', isCompleted: false },
      ]
    },
    {
      id: 'machine-chest-press',
      name: '器械坐姿推胸',
      targetMuscle: '胸大肌',
      defaultSets: 4,
      repRange: '10–12',
      weight: 45,
      restSeconds: 90,
      previousNote: '器械被占极佳替代 · 轨迹稳定',
      recommendationTag: '器械平替',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXAcQbz5j3Pl72JmosyfpKyOfnwiOiV6qAwufMMpEaaRrzkO3LVdKjF3__wahVykSAse3GpYRhIT8yfpK6VwMdN7_frSCd9mKbVvvrnRsvUi-bWWcVI9j5l3Z3XenNoNg9xopNN99ucNTJbOHJtNmG8bbpq2nYH_lNi0-oUQw-0PHuCM0zNdKBgADbp6W0fDjzazcv8huPBNoKyDQL2pwztTejAB-m0IEWFbzRt9dBpkwgDxuR3bkX0Q',
      instructions: {
        overview: '固定器械推胸提供双轴弧线运动轨迹，力竭时无被砸风险。',
        keyPoints: ['调节坐垫高度使握把齐胸中下部', '推起时背部贴紧靠垫', '离心放回时保持胸肌持续紧绷'],
        commonMistakes: ['身体前扑借力', '耸肩发力'],
        warmupAdvice: '轻重量感受握把两端发力对称性。'
      },
      sets: [
        { setNumber: 1, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 2, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 3, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 4, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
      ]
    }
  ],
  'seated-cable-row': [
    {
      id: 'lat-pulldown',
      name: '高位下拉 (宽握/对握)',
      targetMuscle: '背阔肌',
      defaultSets: 4,
      repRange: '10–12',
      weight: 45,
      restSeconds: 90,
      previousNote: '背阔肌主打 · 器械被占经典平替',
      recommendationTag: '经典替代',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3O12FPq_cqnR4uHVNWQdn1J_ryPOAoB5LlThek_hfpAXwLQ7OhCdmPZMkPiQ6_xdpq_XpByt4pWkRZQnCy2BimuDtQvXjJ9_l2t4jcKs9sQINqkOCgaI_Im1mMrcbwKp3pJ12ITjHL1vkuvXpMc_9vedCVU1j2t2Tor-xEG9nopAb8zENtQkcyWy2gWN4iPl81QgSCVrN0kE9WqKxtsEIoLjuX1342y3hIyp8nIwkZWqOrREg58WOLw',
      instructions: {
        overview: '经典背部垂直拉动作，强化背阔肌宽度，肘部下沉发力感受直接。',
        keyPoints: ['大腿卡紧固定挡板', '沉肩拉向锁骨上端', '躯干微后仰15度即可'],
        commonMistakes: ['过大幅度后仰甩动', '手腕扣压'],
        warmupAdvice: '热身组先做5次只沉肩不屈肘的肩胛引体。'
      },
      sets: [
        { setNumber: 1, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 2, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 3, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 4, weight: 45, reps: 10, targetReps: '10-12', isCompleted: false },
      ]
    },
    {
      id: 'single-arm-dumbbell-row',
      name: '单臂哑铃划船',
      targetMuscle: '背阔肌/斜方肌',
      defaultSets: 4,
      repRange: '10–12',
      weight: 20,
      restSeconds: 90,
      previousNote: '单侧孤立 · 改善左右发力不平衡',
      recommendationTag: '单侧平衡',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC3O12FPq_cqnR4uHVNWQdn1J_ryPOAoB5LlThek_hfpAXwLQ7OhCdmPZMkPiQ6_xdpq_XpByt4pWkRZQnCy2BimuDtQvXjJ9_l2t4jcKs9sQINqkOCgaI_Im1mMrcbwKp3pJ12ITjHL1vkuvXpMc_9vedCVU1j2t2Tor-xEG9nopAb8zENtQkcyWy2gWN4iPl81QgSCVrN0kE9WqKxtsEIoLjuX1342y3hIyp8nIwkZWqOrREg58WOLw',
      instructions: {
        overview: '利用单侧哑铃划船可以单独纠正单侧发力感，且腰椎处于三点支撑状态更安全。',
        keyPoints: ['膝盖与同侧手撑在长凳', '拉动时肘关节向后上方提拉', '下放时充分拉伸背阔肌'],
        commonMistakes: ['躯干大幅旋转借力', '上拉时耸肩'],
        warmupAdvice: '先做较弱一侧，再做优势侧。'
      },
      sets: [
        { setNumber: 1, weight: 20, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 2, weight: 20, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 3, weight: 20, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 4, weight: 20, reps: 10, targetReps: '10-12', isCompleted: false },
      ]
    }
  ],
  'leg-press': [
    {
      id: 'hack-squat',
      name: '哈克深蹲机',
      targetMuscle: '股四头肌/臀大肌',
      defaultSets: 4,
      repRange: '10–12',
      weight: 60,
      restSeconds: 120,
      previousNote: '下肢主干替换 · 稳定刺激股四',
      recommendationTag: '深度泵感',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALwYg8diGgZL7M9FAH-XcoD5mQWunkiTgIIUtk4ZdC5G6mFaq7nuzxhgmnugmaEfPv59vvS4WmXFFJsYnTtaD4cnQy1SssObOLU4aJhUHrPMecupkAAFeYF6WKaFRBb6UlYcu9VnMtys7shhq6uygG_px9la-du8ZtDqWxLRZTwhy7WTRRYEw8qZDums4JsdneklxIl_kAcnufBVh80uG6OxCbAMQEgKIlc2EaDTScE-Ey2XxswYGrlw',
      instructions: {
        overview: '固定斜度深蹲设备，肩部靠牢软垫，下肢行程饱满且极少腰椎压力。',
        keyPoints: ['双脚置于踏板中上部', '下蹲至大腿水平', '膝关节对准脚尖方向'],
        commonMistakes: ['膝盖内收', '下蹲末端尾骨卷起离板'],
        warmupAdvice: '空架尝试膝踝活动度。'
      },
      sets: [
        { setNumber: 1, weight: 60, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 2, weight: 60, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 3, weight: 60, reps: 10, targetReps: '10-12', isCompleted: false },
        { setNumber: 4, weight: 60, reps: 10, targetReps: '10-12', isCompleted: false },
      ]
    }
  ]
};
