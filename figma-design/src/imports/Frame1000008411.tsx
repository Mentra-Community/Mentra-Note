function Frame2() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[8px] items-start not-italic p-[16px] relative w-full whitespace-pre-wrap">
          <p className="font-['Red_Hat_Display:SemiBold',sans-serif] leading-[20px] relative shrink-0 text-[#0a0a0a] text-[14px] w-full">Important</p>
          <ul className="block font-['Red_Hat_Display:Regular',sans-serif] leading-[0] list-disc relative shrink-0 text-[#646464] text-[12px] w-full">
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Summarize the key action items identified during the meeting.</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Assign responsible team members and set deadlines for each action item.</span>
            </li>
            <li className="ms-[18px]">
              <span className="leading-[16px]">Clarify the next steps and ensure everyone is clear on their respective tasks.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[6px] items-start not-italic p-[16px] relative w-full whitespace-pre-wrap">
          <p className="font-['Red_Hat_Display:SemiBold',sans-serif] leading-[20px] relative shrink-0 text-[#0a0a0a] text-[14px] w-full">Product Meeting</p>
          <ol className="block font-['Red_Hat_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#646464] text-[12px] w-full" start="1">
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Review of Previous Action Items</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Product Development Update</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">User Feedback and Customer Insights</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Competitive Analysis</span>
            </li>
            <li className="ms-[18px]">
              <span className="leading-[16px]">{`Roadmap Discussion `}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-h-px min-w-px relative">
      <Frame2 />
      <Frame />
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[5px] items-start not-italic p-[16px] relative w-full whitespace-pre-wrap">
          <p className="font-['Red_Hat_Display:SemiBold',sans-serif] leading-[20px] relative shrink-0 text-[#0a0a0a] text-[14px] w-full">Shopping list</p>
          <ol className="block font-['Red_Hat_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#646464] text-[12px] w-full" start="1">
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Rice</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Pasta</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Cereal</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Yogurt</span>
            </li>
            <li className="mb-0 ms-[18px]">
              <span className="leading-[16px]">Cheese</span>
            </li>
            <li className="ms-[18px]">
              <span className="leading-[16px]">Butter</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[5px] items-start not-italic p-[16px] relative w-full">
          <p className="font-['Red_Hat_Display:SemiBold',sans-serif] leading-[20px] relative shrink-0 text-[#0a0a0a] text-[14px] w-full whitespace-pre-wrap">Notes</p>
          <ul className="block font-['Red_Hat_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#646464] text-[12px] w-full">
            <li className="list-disc ms-[18px] whitespace-pre-wrap">
              <span className="leading-[16px]">Share insights and findings from recent competitive analysis.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-white relative rounded-[8px] shrink-0 w-full">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[5px] items-start not-italic p-[16px] relative w-full">
          <p className="font-['Red_Hat_Display:SemiBold',sans-serif] leading-[20px] relative shrink-0 text-[#0a0a0a] text-[14px] w-full whitespace-pre-wrap">Notes</p>
          <ul className="block font-['Red_Hat_Display:Regular',sans-serif] leading-[0] relative shrink-0 text-[#646464] text-[12px] w-full">
            <li className="list-disc ms-[18px] whitespace-pre-wrap">
              <span className="leading-[16px]">Share insights and findings from recent competitive analysis.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[12px] items-start min-h-px min-w-px relative">
      <Frame1 />
      <Frame3 />
      <Frame4 />
    </div>
  );
}

export default function Frame7() {
  return (
    <div className="content-stretch flex gap-[12px] items-start relative size-full">
      <Frame6 />
      <Frame5 />
    </div>
  );
}